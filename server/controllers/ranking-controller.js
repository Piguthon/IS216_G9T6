/*
  FILE:      controllers/ranking-controller.js
  OWNER:     JS (team-written)
  PURPOSE:   POST /api/ranking/:code → the host works out the fairest meeting points, which are
             saved on the meetup (logged in, host only). From then on nobody can join and
             locations are locked; members can only leave, and the host can recalculate
             GET /api/ranking/:code → the saved fairest meeting points, for anyone with the code
             GET /api/ranking/:code/leave-times → when each member should leave for the
             meeting point the host confirmed
             Both GETs send each trip's steps and firstBusStopCode to members only (by session
             or X-Member-Token, middleware/member.js): the routes start at members' homes
  METHOD:    1. every member needs to have pressed Confirm location (at least 2 members); once the
                host has confirmed a meeting point, anyone who hasn't is just left out
             2. midpoint of their starts → the 30 closest MRT stations, and bus interchanges
                within 3km
             3. each member's time to each candidate by their own travel mode: public transport,
                leaving 45 minutes before the meetup, or at 05:30 overnight, or car
                (OneMap, one call at a time)
             4. rank with the fairness rule (utils/fairness.js) and keep the fairest 5
  DATA:      { ranking: [ { stationId, name, type, lat, lng,
                            times: [ { memberId, name, travelMode, minutes, waitMinutes,
                                       firstBusStopCode, steps } ],
                            longestMinutes, totalMinutes } ],   (fairest first)
               departure: { date, time },   (the departure these travel times are for)
               rankedAt,                    (when the host worked them out)
               isOutdated }                 (someone changed their start point, travel mode or
                                             confirmation, or the host the date or time, since)
             leave-times: { trips: [ { memberId, name, travelMode, minutes, waitMinutes,
                                       firstBusStopCode, steps, leaveAt, arriveAt } ] }
  SAVED:     the ranking is saved on the meetup, so members still see it after a restart. The host
             pressing again within 30 minutes with nothing changed reuses it (OneMap calls are
             slow). Leave times are kept in memory for 30 minutes.
*/
const Meetup = require('../models/meetup-model');
const Station = require('../models/station-model');
const { getPtRoute, getArriveByRoute, getDriveRoute } = require('../services/onemap');
const { findMidpoint, pickCandidates, rankCandidates } = require('../utils/fairness');
const { tripTimeForMeetup } = require('../utils/meetup-date');
const { rankingWithoutRoutes, tripsWithoutRoutes } = require('../utils/route-privacy');
const { findCaller } = require('../middleware/member');

// With every MRT station in the list, the few nearest the midpoint are often small stations,
// so it tests the 30 nearest: the fairest is usually a well-connected one a little further out.
// Bus interchanges only count when they are close, or they crowd out better MRT options.
const CANDIDATES_PER_TYPE = { mrt: 30, interchange: 2 };
const MAX_KM_BY_TYPE = { interchange: 3 };
const RESULTS_SHOWN = 5; // the fairest few are shown and voted on
const CACHE_MS = 30 * 60 * 1000;
const FIRST_TRIPS = '05:30'; // no bus or train gets anyone there before this
const leaveTimesCache = new Map(); // code → { key, result, savedAt }

// OneMap sometimes answers 502/503 for a moment: wait and try once more.
// isArrival: time is when to arrive, not when to leave.
// Returns the member's route by their own travel mode, or null when there is no route or OneMap
// keeps failing.
async function routeWithRetry(member, station, date, time, isArrival = false) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (member.travelMode === 'car') {
        return await getDriveRoute(member.start, station, date, time, isArrival);
      }
      if (isArrival) return await getArriveByRoute(member.start, station, date, time);
      return await getPtRoute(member.start, station, date, time);
    } catch (error) {
      const status = error.response ? error.response.status : 0;
      console.warn(`OneMap route to ${station.name} failed (${status || error.message}), attempt ${attempt}`);
      if (attempt === 2 || (status && status < 500)) return null;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return null;
}

// Members who pressed Confirm location (which needs a start point)
function readyMembers(meetup) {
  return meetup.members.filter((member) => member.ready && member.start);
}

// Whether the request comes from a member (by session or X-Member-Token). A bad credential
// isn't an error on the GETs: the caller just counts as someone who only knows the code.
async function isCallerMember(req, meetup) {
  try {
    return Boolean(await findCaller(req, meetup));
  } catch (error) {
    if (error.message !== 'Invalid session') throw error;
    return false;
  }
}

// The saved ranking as the API sends it. Without routes, only the travel times are sent
// (utils/route-privacy.js): the routes start at members' homes.
function toResponse(meetup, isOutdated, withRoutes = true) {
  const ranking = meetup.ranking.ranking;
  return {
    ranking: withRoutes ? ranking : rankingWithoutRoutes(ranking),
    departure: meetup.ranking.departure,
    rankedAt: meetup.rankedAt,
    isOutdated,
  };
}

// The leave times as the API sends them: without routes for someone who isn't a member
function leaveTimesResponse(result, withRoutes) {
  return withRoutes ? result : { trips: tripsWithoutRoutes(result.trips) };
}

// Changes whenever anything that affects the travel times changes
function cacheKey(meetup, ready) {
  const starts = ready
    .map((m) => `${m._id}:${m.start.lat},${m.start.lng}:${m.travelMode}`)
    .join('|');
  return `${meetup.date} ${meetup.time} ${starts}`;
}

// GET: the ranking the host last worked out. Nobody but the host can start a new calculation.
exports.getRanking = async (req, res) => {
  try {
    const meetup = await Meetup.findRanking(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }
    if (!meetup.ranking) {
      return res.status(404).json({ error: "The host hasn't worked out the fair meeting points yet" });
    }

    const isOutdated = meetup.ranking.key !== cacheKey(meetup, readyMembers(meetup));
    const isMember = await isCallerMember(req, meetup);
    res.json(toResponse(meetup, isOutdated, isMember));
  } catch (error) {
    console.error('Error getting ranking:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST: the host works out the fairest meeting points, and they are saved for everyone
exports.calculateRanking = async (req, res) => {
  try {
    const meetup = await Meetup.findRanking(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }

    const host = meetup.members[0];
    if (!host || host.userId !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the host can work out the fair meeting points' });
    }

    const ready = readyMembers(meetup);
    if (ready.length < 2) {
      return res.status(400).json({ error: 'At least 2 members need to confirm their location' });
    }
    if (!meetup.finalStation && ready.length < meetup.members.length) {
      return res.status(400).json({ error: 'Every member needs to confirm their location first' });
    }

    const key = cacheKey(meetup, ready);
    const saved = meetup.ranking;
    if (saved && saved.key === key && Date.now() - meetup.rankedAt.getTime() < CACHE_MS) {
      return res.json(toResponse(meetup, false));
    }

    const stations = await Station.find().lean();
    const midpoint = findMidpoint(ready.map((member) => member.start));
    const picked = pickCandidates(stations, midpoint, CANDIDATES_PER_TYPE, MAX_KM_BY_TYPE);
    const departure = tripTimeForMeetup(meetup.date, meetup.time);

    const candidates = [];
    for (const station of picked) {
      const times = [];
      for (const member of ready) {
        const route = await routeWithRetry(member, station, departure.date, departure.time);
        if (!route) break; // no route for this member: drop the candidate
        times.push({
          memberId: String(member._id),
          name: member.name,
          travelMode: member.travelMode,
          minutes: route.minutes,
          waitMinutes: route.waitMinutes,
          firstBusStopCode: route.firstBusStopCode,
          steps: route.steps,
        });
      }
      if (times.length === ready.length) {
        candidates.push({
          stationId: station.stationId,
          name: station.name,
          type: station.type,
          lat: station.lat,
          lng: station.lng,
          times,
        });
      }
    }

    if (candidates.length === 0) {
      return res.status(502).json({ error: 'No routes found. Please try again later.' });
    }

    const ranking = rankCandidates(candidates).slice(0, RESULTS_SHOWN);
    const updated = await Meetup.saveRanking(meetup.code, { key, ranking, departure });
    res.json({ ranking, departure, rankedAt: updated.rankedAt, isOutdated: false });
  } catch (error) {
    console.error('Error working out ranking:', error.message);
    res.status(502).json({ error: 'Could not get travel times from OneMap. Please try again.' });
  }
};

exports.getLeaveTimes = async (req, res) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }

    const station = meetup.finalStation;
    if (!station) {
      return res.status(400).json({ error: "The host hasn't confirmed a meeting point yet" });
    }

    // Routes go to members only; the cache keeps the full trips
    const isMember = await isCallerMember(req, meetup);

    const ready = meetup.members.filter((member) => member.start);
    const key = `${station.optionId} ${cacheKey(meetup, ready)}`;
    const cached = leaveTimesCache.get(meetup.code);
    if (cached && cached.key === key && Date.now() - cached.savedAt < CACHE_MS) {
      return res.json(leaveTimesResponse(cached.result, isMember));
    }

    const departure = tripTimeForMeetup(meetup.date, meetup.time);
    const trips = [];
    for (const member of ready) {
      let route;
      if (meetup.time < FIRST_TRIPS && member.travelMode !== 'car') {
        route = await routeWithRetry(member, station, departure.date, departure.time);
      } else {
        route = await routeWithRetry(member, station, meetup.date, meetup.time, true);
      }
      if (!route) continue; // no route for this member: they just have no leave time
      trips.push({
        memberId: String(member._id),
        name: member.name,
        travelMode: member.travelMode,
        minutes: route.minutes,
        waitMinutes: route.waitMinutes,
        firstBusStopCode: route.firstBusStopCode,
        steps: route.steps,
        leaveAt: route.leaveAt,
        arriveAt: route.arriveAt,
      });
    }

    const result = { trips };
    if (trips.length > 0) {
      leaveTimesCache.set(meetup.code, { key, result, savedAt: Date.now() });
    }
    res.json(leaveTimesResponse(result, isMember));
  } catch (error) {
    console.error('Error getting leave times:', error.message);
    res.status(502).json({ error: 'Could not get travel times from OneMap. Please try again.' });
  }
};
