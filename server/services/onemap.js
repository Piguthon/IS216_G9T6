// OneMap client: token management plus public-transport and driving routes.

const axios = require('axios');
const Token = require('../models/token-model');
const { singaporeToMs, msToSingapore } = require('../utils/meetup-date');

const BASE_URL = 'https://www.onemap.gov.sg';
const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;
const PARKING_MINUTES = 10;

let cachedToken = null;

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
    const expiresAt = new Date(Number(response.data.expiry_timestamp) * 1000);
    cachedToken = await Token.saveToken('onemap', accessToken, expiresAt);
    return cachedToken.accessToken;
  } catch (error) {
    console.error('OneMap getToken failed:', error.message);
    throw error;
  }
}

async function getToken() {
  if (hasTimeLeft(cachedToken)) return cachedToken.accessToken;

  const stored = await Token.findToken('onemap');
  if (hasTimeLeft(stored)) {
    cachedToken = stored;
    return cachedToken.accessToken;
  }
  return await requestNewToken();
}

function toOneMapDate(date) {
  const parts = date.split('-');
  return `${parts[1]}-${parts[2]}-${parts[0]}`;
}

function toOneMapTime(time) {
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
    headers: { Authorization: token }
  });
  return response.data;
}

// One part of a trip, e.g. "bus 99 from A to B". Each is at least 1 minute.
function toStep(leg) {
  return {
    mode: leg.mode,
    route: leg.route || '',
    routeName: leg.routeLongName || '',
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
  let firstBusStopCode = null;
  for (const leg of itinerary.legs) {
    if (leg.mode === 'BUS') {
      firstBusStopCode = leg.from.stopCode;
      break;
    }
  }

  return {
    minutes: Math.round(itinerary.duration / 60),
    waitMinutes: Math.round((itinerary.waitingTime || 0) / 60),
    firstBusStopCode: firstBusStopCode,
    steps: itinerary.legs.map(toStep),
    leaveAt: msToSingapore(itinerary.startTime).time,
    arriveAt: msToSingapore(itinerary.endTime).time
  };
}

// The fastest trip from date and time, or null if OneMap finds no route
async function getPtRoute(start, end, date, time) {
  const itineraries = await getItineraries(start, end, date, time);
  if (itineraries.length === 0) return null;
  return toRoute(fastestOf(itineraries));
}

// Like getPtRoute, but time is when to arrive (OneMap ignores arriveBy, so this searches backwards)
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
    mode,
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

// A car trip in the same shape as getPtRoute, or null if OneMap finds no road route
async function getDriveRoute(start, end, date, time, isArrival = false) {
  let data;
  try {
    data = await callDriving(start, end, await getToken());
  } catch (error) {
    const status = error.response ? error.response.status : 0;
    if (status === 404) return null;
    if (status !== 401) throw error;
    data = await callDriving(start, end, await requestNewToken());
  }
  if (!data.route_summary) return null;

  const driveMinutes = Math.max(1, Math.round(data.route_summary.total_time / 60));
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