// FILE:      services/onemap.js
// OWNER:     I (team-written)
// PURPOSE:   OneMap client for FairSpot: token management + public-transport and driving routes.
// EXPORTS:   getPtRoute(start, end, date, time) → { minutes, waitMinutes, firstBusStopCode, steps,
//                leaveAt, arriveAt } or null. steps: [ { mode, route, routeName, from, fromCode,
//                to, toCode, stops, minutes, points } ], where points is the leg's encoded map
//                line · start/end { lat, lng } · date "YYYY-MM-DD" · time "HH:MM"
//            getArriveByRoute(start, end, date, time) → the same, but time is when to arrive
//            getDriveRoute(start, end, date, time, isArrival) → the same shape for a car trip,
//                with PARKING_MINUTES added. OneMap's driving time ignores traffic and the time of
//                day, so date and time only work out leaveAt and arriveAt
//            tokenStatus() → { ok, expiresAt } (used by routes/health-routes.js)
//            (getToken() → a valid OneMap access token, used inside this file only)
// USED BY:   ranking (JS) via getPtRoute, getArriveByRoute and getDriveRoute · live map (S) via
//            getPtRoute and getDriveRoute · health route via tokenStatus
// REVISE:    Wk 5 Axios GET/POST, headers config, async/await, try/catch
//
// What this handles:
//   1. Gets a token using the team's OneMap account (credentials in env vars, never committed)
//   2. Stores the token in MongoDB (models/token-model.js) so a restart reuses it
//      instead of calling getToken again (tokens last 72 h)
//   3. Keeps using the token until it is about to expire. Asking for a new one any earlier
//      doesn't help: OneMap just sends back the same token until it expires.
//   4. If OneMap rejects the token (401), gets a new one and retries once
//
// Call getPtRoute one route at a time (for...of + await), not all at once.
// Required env vars: ONEMAP_EMAIL, ONEMAP_PASSWORD
// Requires an open mongoose connection before the first call.

const axios = require('axios');
const Token = require('../models/token-model');
const { singaporeToMs, msToSingapore } = require('../utils/meetup-date');

const BASE_URL = 'https://www.onemap.gov.sg';
const FIVE_MINUTES = 5 * 60 * 1000;         // in milliseconds
const ONE_MINUTE = 60 * 1000;               // in milliseconds
// Transit times include walking and waiting, so car trips allow for parking and the walk from it
const PARKING_MINUTES = 10;

let cachedToken = null;   // { accessToken, expiresAt } kept in memory between calls

// A route call takes a few seconds at most, so a minute to spare is enough
function hasTimeLeft(token) {
  if (!token) return false;
  return new Date(token.expiresAt).getTime() - Date.now() > ONE_MINUTE;
}

async function requestNewToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/post/getToken`, {
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD
    });
    const accessToken = response.data.access_token;
    const expiresAt = new Date(Number(response.data.expiry_timestamp) * 1000);  // OneMap gives seconds
    cachedToken = await Token.saveToken('onemap', accessToken, expiresAt);
    return cachedToken.accessToken;
  } catch (error) {
    console.error('OneMap getToken failed:', error.message);
    throw error;   // let the caller decide what to tell the user
  }
}

async function getToken() {
  // 1. memory  2. MongoDB  3. ask OneMap
  if (hasTimeLeft(cachedToken)) return cachedToken.accessToken;

  const stored = await Token.findToken('onemap');
  if (hasTimeLeft(stored)) {
    cachedToken = stored;
    return cachedToken.accessToken;
  }
  return await requestNewToken();
}

function toOneMapDate(date) {        // "2026-11-06" → "11-06-2026"
  const parts = date.split('-');
  return `${parts[1]}-${parts[2]}-${parts[0]}`;
}

function toOneMapTime(time) {        // "18:00" → "18:00:00"
  return time.length === 5 ? `${time}:00` : time;
}

async function callRouting(start, end, date, time, token) {
  const response = await axios.get(`${BASE_URL}/api/public/routingsvc/route`, {
    params: {
      start: `${start.lat},${start.lng}`,
      end: `${end.lat},${end.lng}`,
      routeType: 'pt',
      mode: 'TRANSIT',
      date: toOneMapDate(date),
      time: toOneMapTime(time),
      maxWalkDistance: 1000,
      numItineraries: 3
    },
    headers: { Authorization: token }   // the raw token works (checked 3 Oct)
  });
  return response.data;
}

// One part of a trip, e.g. "bus 99 from A to B". Each is at least 1 minute.
function toStep(leg) {
  return {
    mode: leg.mode,                             // WALK, BUS, SUBWAY
    route: leg.route || '',                     // "99", "EW"
    routeName: leg.routeLongName || '',         // "EAST WEST LINE"
    from: leg.from.name,
    fromCode: leg.from.stopCode || null,
    to: leg.to.name,
    toCode: leg.to.stopCode || null,
    stops: leg.transitLeg ? (leg.intermediateStops || []).length + 1 : 0,
    minutes: Math.max(1, Math.round(leg.duration / 60)),
    points: leg.legGeometry ? leg.legGeometry.points : ''
  };
}

// The (up to 3) trips OneMap finds from date and time, or [] if there are none
async function getItineraries(start, end, date, time) {
  let data;
  try {
    data = await callRouting(start, end, date, time, await getToken());
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // token rejected: get a fresh one and try once more
      data = await callRouting(start, end, date, time, await requestNewToken());
    } else {
      throw error;
    }
  }

  const itineraries = data.plan ? data.plan.itineraries : [];
  return itineraries || [];
}

function fastestOf(itineraries) {
  let fastest = itineraries[0];
  for (const itinerary of itineraries) {
    if (itinerary.duration < fastest.duration) fastest = itinerary;
  }
  return fastest;
}

function toRoute(itinerary) {
  // the first bus leg gives the stop for live bus arrivals (null if the trip is MRT only)
  let firstBusStopCode = null;
  for (const leg of itinerary.legs) {
    if (leg.mode === 'BUS') {
      firstBusStopCode = leg.from.stopCode;
      break;
    }
  }

  return {
    minutes: Math.round(itinerary.duration / 60),   // duration is in seconds
    waitMinutes: Math.round((itinerary.waitingTime || 0) / 60),
    firstBusStopCode: firstBusStopCode,
    steps: itinerary.legs.map(toStep),
    leaveAt: msToSingapore(itinerary.startTime).time,
    arriveAt: msToSingapore(itinerary.endTime).time
  };
}

// start/end: { lat, lng } · date "YYYY-MM-DD" · time "HH:MM"
// returns the fastest trip from date and time, or null if OneMap finds no route
async function getPtRoute(start, end, date, time) {
  const itineraries = await getItineraries(start, end, date, time);
  if (itineraries.length === 0) return null;
  return toRoute(fastestOf(itineraries));
}

// Same inputs and result as getPtRoute, but time is when to arrive. OneMap ignores arriveBy, so
// this works backwards: it searches from the arrival time minus the trip length and 5 minutes,
// and keeps the trip that leaves latest but still arrives on time. If they are all late, it
// searches earlier once more, then settles for the trip that arrives first.
async function getArriveByRoute(start, end, date, time) {
  const arriveBy = singaporeToMs(date, time);
  const firstSearch = await getItineraries(start, end, date, time);
  if (firstSearch.length === 0) return null;

  let searchFrom = arriveBy - fastestOf(firstSearch).duration * 1000 - FIVE_MINUTES;
  firstSearch.sort((a, b) => a.endTime - b.endTime);
  let firstToArrive = firstSearch[0];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const search = msToSingapore(searchFrom);
    const itineraries = await getItineraries(start, end, search.date, search.time);
    if (itineraries.length === 0) break;

    const onTime = itineraries.filter((itinerary) => itinerary.endTime <= arriveBy);
    if (onTime.length > 0) {
      onTime.sort((a, b) => b.startTime - a.startTime);
      return toRoute(onTime[0]);
    }

    itineraries.sort((a, b) => a.endTime - b.endTime);
    firstToArrive = itineraries[0];
    searchFrom -= firstToArrive.endTime - arriveBy + FIVE_MINUTES;
  }
  return toRoute(firstToArrive);
}

async function callDriving(start, end, token) {
  const response = await axios.get(`${BASE_URL}/api/public/routingsvc/route`, {
    params: {
      start: `${start.lat},${start.lng}`,
      end: `${end.lat},${end.lng}`,
      routeType: 'drive'
    },
    headers: { Authorization: token }
  });
  return response.data;
}

// One part of a car trip, in the same shape as toStep
function carStep(mode, minutes, points) {
  return {
    mode,                                       // CAR, PARK
    route: '',
    routeName: '',
    from: 'Origin',
    fromCode: null,
    to: 'Destination',
    toCode: null,
    stops: 0,
    minutes,
    points
  };
}

// isArrival: time is when to arrive, not when to leave.
// Returns null if OneMap finds no road route (it answers 404).
async function getDriveRoute(start, end, date, time, isArrival = false) {
  let data;
  try {
    data = await callDriving(start, end, await getToken());
  } catch (error) {
    const status = error.response ? error.response.status : 0;
    if (status === 404) return null;
    if (status !== 401) throw error;
    // token rejected: get a fresh one and try once more
    data = await callDriving(start, end, await requestNewToken());
  }
  if (!data.route_summary) return null;

  const driveMinutes = Math.max(1, Math.round(data.route_summary.total_time / 60));  // in seconds
  const minutes = driveMinutes + PARKING_MINUTES;
  const chosenTime = singaporeToMs(date, time);
  const leavesAt = isArrival ? chosenTime - minutes * ONE_MINUTE : chosenTime;

  return {
    minutes,
    waitMinutes: 0,
    firstBusStopCode: null,
    steps: [
      carStep('CAR', driveMinutes, data.route_geometry),
      carStep('PARK', PARKING_MINUTES, '')
    ],
    leaveAt: msToSingapore(leavesAt).time,
    arriveAt: msToSingapore(leavesAt + minutes * ONE_MINUTE).time
  };
}

async function tokenStatus() {
  try {
    await getToken();
    return { ok: true, expiresAt: cachedToken.expiresAt };
  } catch (error) {
    return { ok: false, error: error.response ? error.response.status : error.message };
  }
}

module.exports = { getPtRoute, getArriveByRoute, getDriveRoute, tokenStatus };