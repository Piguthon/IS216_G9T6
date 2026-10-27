/*
  FILE:      controllers/ranking-controller.js
  OWNER:     JS (team-written)
  PURPOSE:   GET /api/ranking/:code → the fairest meeting points for a meetup
  STEPS:     1. members with a start point (at least 2)
             2. midpoint of their starts → the closest MRT stations and bus interchanges
             3. each member's public-transport time to each candidate (OneMap, one call at a time)
             4. rank with the fairness rule (utils/fairness.js)
  DATA:      Ranking [ { stationId, name, type, lat, lng,
                         times: [ { memberId, name, minutes, firstBusStopCode } ],
                         longestMinutes, totalMinutes } ]   (fairest first)
  CACHE:     results are kept in memory for 30 minutes per meetup, and recalculated as soon as
             a start point, the date or the time changes (OneMap calls are slow)
*/
const Meetup = require('../models/meetup-model');
const Station = require('../models/station-model');
const { getPtRoute } = require('../services/onemap');
const { findMidpoint, pickCandidates, rankCandidates } = require('../utils/fairness');

const CANDIDATES_PER_TYPE = { mrt: 3, interchange: 2 };
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map(); // code → { key, ranking, savedAt }

// OneMap sometimes answers 502/503 for a moment: wait and try once more.
// Returns { minutes, firstBusStopCode }, or null when there is no route or OneMap keeps failing.
async function routeWithRetry(start, station, date, time) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await getPtRoute(start, station, date, time);
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
  const starts = ready.map((m) => `${m._id}:${m.start.lat},${m.start.lng}`).join('|');
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

    const key = cacheKey(meetup, ready);
    const cached = cache.get(meetup.code);
    if (cached && cached.key === key && Date.now() - cached.savedAt < CACHE_MS) {
      return res.json(cached.ranking);
    }

    const stations = await Station.find().lean();
    const midpoint = findMidpoint(ready.map((member) => member.start));
    const picked = pickCandidates(stations, midpoint, CANDIDATES_PER_TYPE);

    const candidates = [];
    for (const station of picked) {
      const times = [];
      for (const member of ready) {
        const route = await routeWithRetry(member.start, station, meetup.date, meetup.time);
        if (!route) break; // no route for this member: drop the candidate
        times.push({
          memberId: String(member._id),
          name: member.name,
          minutes: route.minutes,
          firstBusStopCode: route.firstBusStopCode,
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
      return res.status(502).json({ error: 'No public-transport routes found. Please try again later.' });
    }

    const ranking = rankCandidates(candidates);
    cache.set(meetup.code, { key, ranking, savedAt: Date.now() });
    res.json(ranking);
  } catch (error) {
    console.error('Error getting ranking:', error.message);
    res.status(502).json({ error: 'Could not get travel times from OneMap. Please try again.' });
  }
};
