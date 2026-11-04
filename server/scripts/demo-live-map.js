/*
  FILE:     scripts/demo-live-map.js
  OWNER:    S (team-written)
  PURPOSE:  Demo the live map without six phones. Sets up meetup DEMO01 with two real accounts,
            one for each presenter's device, and four simulated members who travel to the meeting
            point on real OneMap routes, sped up so they all arrive within 30 seconds. It only
            writes to MongoDB, so the app itself has no demo mode or way around the login.
  RUN:      from server/, with DEMO_PASSWORD set in .env:
            node scripts/demo-live-map.js           set up, then press Enter to set everyone off
            node scripts/demo-live-map.js --clean   delete the demo meetup and accounts
  TALKS TO: models/meetup-model.js, models/location-model.js, models/vote-model.js,
            models/user-model.js, services/onemap.js (getPtRoute), utils/polyline.js, config/db.js
*/

const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

const readline = require('node:readline');
const { setTimeout: sleep } = require('node:timers/promises');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Meetup = require('../models/meetup-model');
const Location = require('../models/location-model');
const Vote = require('../models/vote-model');
const User = require('../models/user-model');
const { getPtRoute } = require('../services/onemap');
const { distanceKm } = require('../utils/fairness');
const { msToSingapore } = require('../utils/meetup-date');
const { liveWindowStatus } = require('../utils/live-window');
const { decodePolyline } = require('../utils/polyline');
const stations = require('../data/stations.json');

const DEMO_CODE = 'DEMO01'; // generated codes never contain the letter O, so this can't clash
const MEETING_POINT = 'city-hall';
const MINUTES_UNTIL_MEETUP = 45; // the live map stays open for 75 minutes from the start
const TICK_MS = 2000; // how often the simulated people move
// The longest trip takes this long, and shorter trips scale with it. Pages refresh every 5 seconds,
// so on screen the whole run takes about 25 seconds.
const LONGEST_TRIP_SECONDS = 20;
const MINUTES_PER_KM = 3; // the trip time if OneMap is down
const TRIP_PLAN_TIME = '10:00'; // overnight OneMap only finds walking trips, so plan a daytime one

// Logging in replaces the account's session, so each device needs its own account
const ACCOUNTS = [
  { name: 'Alex', email: 'demo.host@fairspot.test', from: 'bishan' },
  { name: 'Sam', email: 'demo.guest@fairspot.test', from: 'bugis' },
];
const SIMULATED = [
  { name: 'Priya', from: 'tampines' },
  { name: 'Hafiz', from: 'jurong-east' },
  { name: 'Mei Lin', from: 'woodlands' },
  { name: 'Daniel', from: 'punggol' },
];

function findStation(stationId) {
  return stations.find((station) => station.stationId === stationId);
}

function startPoint(stationId) {
  const { name, lat, lng } = findStation(stationId);
  return { label: `${name} MRT`, postal: '', lat, lng };
}

// Accounts. Creates each one, or resets its password if it already exists.
async function setUpAccounts() {
  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD, 12);
  const users = [];
  for (const account of ACCOUNTS) {
    const user = await User.findOneAndUpdate(
      { email: account.email },
      { name: account.name, passwordHash },
      { upsert: true, returnDocument: 'after' },
    );
    users.push(user);
  }
  return users;
}

// The meetup. Starts fresh each run, in the live window, with the meeting point confirmed.
async function setUpMeetup(users) {
  await deleteMeetup();

  const station = findStation(MEETING_POINT);
  const startsAt = msToSingapore(Date.now() + MINUTES_UNTIL_MEETUP * 60 * 1000);
  await Meetup.createMeetup({
    code: DEMO_CODE,
    hostName: ACCOUNTS[0].name,
    occasion: 'Live map demo',
    date: startsAt.date,
    time: startsAt.time,
  });

  // The host is members[0], so the accounts go in before the simulated people
  for (let i = 0; i < ACCOUNTS.length; i++) {
    await Meetup.addMember(DEMO_CODE, ACCOUNTS[i].name, String(users[i]._id));
  }
  for (const person of SIMULATED) {
    await Meetup.addMember(DEMO_CODE, person.name);
  }

  const meetup = await Meetup.findByCode(DEMO_CODE);
  const everyone = [...ACCOUNTS, ...SIMULATED];
  for (let i = 0; i < everyone.length; i++) {
    const memberId = String(meetup.members[i]._id);
    await Meetup.setMemberStart(DEMO_CODE, memberId, startPoint(everyone[i].from));
  }
  await Meetup.setFinalChoice(DEMO_CODE, 'station', {
    optionId: station.stationId,
    name: station.name,
    lat: station.lat,
    lng: station.lng,
  });

  return Meetup.findByCode(DEMO_CODE);
}

// One trip for each simulated member. If OneMap fails, they go in a straight line, so the demo
// still works.
async function planTrip(member, station) {
  const now = msToSingapore(Date.now());
  let minutes = Math.round(distanceKm(member.start, station) * MINUTES_PER_KM);
  let path = [member.start, station];

  try {
    const route = await getPtRoute(member.start, station, now.date, TRIP_PLAN_TIME);
    const points = route ? route.steps.flatMap((step) => decodePolyline(step.points)) : [];
    if (points.length > 1) {
      minutes = route.minutes;
      path = points.map(([lat, lng]) => ({ lat, lng }));
    }
  } catch (error) {
    console.warn(`OneMap failed for ${member.name}:`, error.message);
  }

  return { memberId: String(member._id), minutes, path };
}

// pointAlong(path, fraction): where you are after that fraction of the path's distance
function pointAlong(path, fraction) {
  const lengths = path.slice(1).map((point, index) => distanceKm(path[index], point));
  let left = lengths.reduce((total, length) => total + length, 0) * fraction;

  for (let i = 0; i < lengths.length; i++) {
    if (left < lengths[i]) {
      const part = left / lengths[i];
      return {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * part,
        lng: path[i].lng + (path[i + 1].lng - path[i].lng) * part,
      };
    }
    left -= lengths[i];
  }
  return path[path.length - 1];
}

// Saves everyone's position. startedAt is null until Enter is pressed. Saving people who have
// arrived too keeps their dots from going grey.
async function moveEveryone(trips, startedAt) {
  const leftAt = startedAt || Date.now();
  const seconds = (Date.now() - leftAt) / 1000;
  const longest = Math.max(...trips.map((trip) => trip.minutes));
  const tripMinutes = (seconds / LONGEST_TRIP_SECONDS) * longest;

  for (const trip of trips) {
    const done = Math.min(1, tripMinutes / trip.minutes);
    const { lat, lng } = pointAlong(trip.path, done);
    await Location.saveLocation(DEMO_CODE, trip.memberId, {
      lat,
      lng,
      accuracyM: 15,
      etaMinutes: Math.ceil(trip.minutes * (1 - done)),
      arriveAt: msToSingapore(leftAt + trip.minutes * 60 * 1000).time,
    });
  }
}

// Keeps moving people until the live map closes, so a forgotten script stops by itself. Each
// Enter sends them back to their starts and sets them off again.
async function runDemo(meetup, trips) {
  let startedAt = null;
  const input = readline.createInterface({ input: process.stdin });
  input.on('line', () => {
    startedAt = Date.now();
    console.log('Everyone is on their way.');
  });

  while (liveWindowStatus(meetup.date, meetup.time).isOpen) {
    try {
      await moveEveryone(trips, startedAt);
    } catch (error) {
      console.warn('Could not save the positions, trying again:', error.message);
    }
    await sleep(TICK_MS);
  }
  input.close();
  console.log('The live map has closed.');
}

async function deleteMeetup() {
  await Meetup.deleteByCode(DEMO_CODE);
  await Vote.deleteByCode(DEMO_CODE);
  await Location.deleteByCode(DEMO_CODE);
}

async function cleanUp() {
  await deleteMeetup();
  await User.deleteMany({ email: { $in: ACCOUNTS.map((account) => account.email) } });
  console.log('Deleted the demo meetup and accounts.');
}

async function main() {
  try {
    await connectDB();

    if (process.argv.includes('--clean')) {
      await cleanUp();
      return;
    }
    if (!process.env.DEMO_PASSWORD) {
      throw new Error('Set DEMO_PASSWORD in server/.env first');
    }

    const users = await setUpAccounts();
    const meetup = await setUpMeetup(users);
    const station = findStation(MEETING_POINT);

    const trips = [];
    for (const member of meetup.members.slice(ACCOUNTS.length)) {
      trips.push(await planTrip(member, station));
    }
    await moveEveryone(trips, null);

    console.log(`Meetup ${DEMO_CODE} is ready. The live map is open until`,
      liveWindowStatus(meetup.date, meetup.time).closesTime);
    for (const account of ACCOUNTS) {
      console.log(`Log in as ${account.email} with DEMO_PASSWORD from server/.env`);
    }
    console.log('Press Enter to set everyone off (again to restart). Ctrl+C stops the script.');

    await runDemo(meetup, trips);
  } catch (error) {
    console.error('Live map demo failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
main();
