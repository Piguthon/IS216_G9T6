/*
  FILE:      controllers/ranking-controller.js
  OWNER:     JS (team-written)
  PURPOSE:   GET /api/ranking/:code → the fairest meeting points for a meetup
             GET /api/ranking/:code/leave-times → when each member should leave for the
             meeting point the host confirmed
  STEPS:     1. every member needs a start point (at least 2 members); once the host has confirmed
                a meeting point, anyone who joins later is just left out
             2. midpoint of their starts → the closest MRT stations and bus interchanges
             3. each member's time to each candidate by their own travel mode: public transport,
                leaving 45 minutes before the meetup, or at 05:30 overnight, or car
                (OneMap, one call at a time)
             4. rank with the fairness rule (utils/fairness.js)
  DATA:      { ranking: [ { stationId, name, type, lat, lng,
                            times: [ { memberId, name, travelMode, minutes, waitMinutes,
                                       firstBusStopCode, steps } ],
                            longestMinutes, totalMinutes } ],   (fairest first)
               departure: { date, time } }   (the departure these travel times are for)
             leave-times: { trips: [ { memberId, name, travelMode, minutes, waitMinutes,
                                       firstBusStopCode, steps, leaveAt, arriveAt } ] }
  CACHE:     results are kept in memory for 30 minutes per meetup, and recalculated as soon as
             a start point, a travel mode, the date or the time changes (OneMap calls are slow)
*/
const Meetup = require('../models/meetup-model');
const Station = require('../models/station-model');
const { getPtRoute, getArriveByRoute, getDriveRoute } = require('../services/onemap');
const { findMidpoint, pickCandidates, rankCandidates } = require('../utils/fairness');
const { tripTimeForMeetup } = require('../utils/meetup-date');

const CANDIDATES_PER_TYPE = { mrt: 3, interchange: 2 };
const CACHE_MS = 30 * 60 * 1000;
const FIRST_TRIPS = '05:30'; // no bus or train gets anyone there before this
const cache = new Map(); // code → { key, result, savedAt }
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

// Changes whenever anything that affects the travel times changes
function cacheKey(meetup, ready) {
  const starts = ready
    .map((m) => `${m._id}:${m.start.lat},${m.start.lng}:${m.travelMode}`)
    .join('|');
  return `${meetup.date} ${meetup.time} ${starts}`;
}

exports.getRanking = async (req, res) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }

    const ready = meetup.members.filter((member) => member.start);
    if (ready.length < 2) {
      return res.status(400).json({ error: 'At least 2 members need a start point' });
    }
    if (!meetup.finalStation && ready.length < meetup.members.length) {
      return res.status(400).json({ error: 'Every member needs a start point first' });
    }

    const key = cacheKey(meetup, ready);
    const cached = cache.get(meetup.code);
    if (cached && cached.key === key && Date.now() - cached.savedAt < CACHE_MS) {
      return res.json(cached.result);
    }

    const stations = await Station.find().lean();
    const midpoint = findMidpoint(ready.map((member) => member.start));
    const picked = pickCandidates(stations, midpoint, CANDIDATES_PER_TYPE);
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

    const result = { ranking: rankCandidates(candidates), departure };
    cache.set(meetup.code, { key, result, savedAt: Date.now() });
    res.json(result);
  } catch (error) {
    console.error('Error getting ranking:', error.message);
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

    const ready = meetup.members.filter((member) => member.start);
    const key = `${station.optionId} ${cacheKey(meetup, ready)}`;
    const cached = leaveTimesCache.get(meetup.code);
    if (cached && cached.key === key && Date.now() - cached.savedAt < CACHE_MS) {
      return res.json(cached.result);
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
    res.json(result);
  } catch (error) {
    console.error('Error getting leave times:', error.message);
    res.status(502).json({ error: 'Could not get travel times from OneMap. Please try again.' });
  }
};
