// FILE:      services/onemap.js
// OWNER:     I (team-written)
// PURPOSE:   OneMap client for FairSpot: token management + public-transport routing.
// EXPORTS:   getToken()   → a valid OneMap access token
//            getPtRoute(start, end, date, time) → { minutes, firstBusStopCode } or null
//                start/end { lat, lng } · date "YYYY-MM-DD" · time "HH:MM"
//            tokenStatus() → { ok, expiresAt } (used by routes/health-routes.js)
// USED BY:   ranking (JS) via getPtRoute · health route via tokenStatus
// REVISE:    Wk 5 Axios GET/POST, headers config, async/await, try/catch
//
// What this handles:
//   1. Gets a token using the team's OneMap account (credentials in env vars, never committed)
//   2. Stores the token in MongoDB (models/token-model.js) so a restart reuses it
//      instead of calling getToken again (tokens last 72 h)
//   3. Gets a new token when less than 12 hours remain
//   4. If OneMap rejects the token (401), gets a new one and retries once
//
// Call getPtRoute one route at a time (for...of + await), not all at once.
// Required env vars: ONEMAP_EMAIL, ONEMAP_PASSWORD
// Requires an open mongoose connection before the first call.

const axios = require('axios');
const Token = require('../models/token-model');

const BASE_URL = 'https://www.onemap.gov.sg';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;   // in milliseconds

let cachedToken = null;   // { accessToken, expiresAt } kept in memory between calls

function hasTimeLeft(token) {
  if (!token) return false;
  return new Date(token.expiresAt).getTime() - Date.now() > TWELVE_HOURS;
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

// start/end: { lat, lng } · date "YYYY-MM-DD" · time "HH:MM"
// returns { minutes, firstBusStopCode } or null if OneMap finds no route
async function getPtRoute(start, end, date, time) {
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
  if (!itineraries || itineraries.length === 0) return null;

  // pick the fastest of the (up to 3) itineraries
  let fastest = itineraries[0];
  for (const itinerary of itineraries) {
    if (itinerary.duration < fastest.duration) fastest = itinerary;
  }

  // the first bus leg gives the stop for live bus arrivals (null if the trip is MRT only)
  let firstBusStopCode = null;
  for (const leg of fastest.legs) {
    if (leg.mode === 'BUS') {
      firstBusStopCode = leg.from.stopCode;
      break;
    }
  }

  return {
    minutes: Math.round(fastest.duration / 60),   // duration is in seconds
    firstBusStopCode: firstBusStopCode
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

module.exports = { getToken, getPtRoute, tokenStatus };