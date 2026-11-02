/*
  FILE:      controllers/live-controller.js
  OWNER:     S (team-written)
  PURPOSE:   live map endpoints: members share where they are, and see everyone's live trip
             time to the meeting point the host confirmed
  FUNCTIONS: getLive       (GET /:code → { window, destination, people, myRoute, myMemberId })
             shareLocation (PUT /:code, body { lat, lng, accuracyM }
                            → { etaMinutes, arriveAt, steps, updatedAt })
             stopSharing   (DELETE /:code → { message })
  DATA:      window { isOpen, hasEnded, opensTime "HH:MM", closesTime "HH:MM" }
             destination { name, lat, lng }   (meetup.finalStation)
             people [ { memberId, name, lat, lng, accuracyM, etaMinutes, arriveAt, updatedAt } ]
             myRoute [ steps ]   (the requester's own trip, same steps as the ranking; [] if not
                                  sharing)
  PRIVACY:   every endpoint needs a login, and req.user decides which member you are, because
             member ids are public (GET /api/meetups/:code). So guests can't use the live map.
             Only members can see or share, only inside the live window
             (utils/live-window.js), and every location is deleted once the window ends
  TALKS TO:  models/meetup-model.js, models/location-model.js, services/onemap.js (getPtRoute)
  REVISE:    Wk 5 blogs-controller.js pattern (exports.fn = async (req, res) => {} with try/catch)
  DONE WHEN:
    - [ ] each endpoint works in Postman or curl
    - [ ] no login gets 401, a non-member gets 403, and nothing is shared outside the live window
    - [ ] OneMap failing never stops a location from saving
*/

// STEPS

// TODO 1: Require the two models, OneMap's route function, and the time and distance helpers.
const Meetup = require('../models/meetup-model');
const Location = require('../models/location-model');
const { getPtRoute } = require('../services/onemap');
const { distanceKm } = require('../utils/fairness');
const { msToSingapore } = require('../utils/meetup-date');
const { liveWindowStatus } = require('../utils/live-window');

// Singapore's rough edges, to catch wrong or made-up coordinates
const SINGAPORE = { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 };
const TRIP_REFRESH_MS = 2 * 60 * 1000; // work the trip out again after 2 minutes...
const TRIP_REFRESH_KM = 0.15; // ...or after moving 150 m
const NOT_A_MEMBER = 'Only members who joined with their account can use the live map';

// TODO 2: Helpers
//           - findMember(meetup, memberId): the member with this id, or null
//           - findMyself(meetup, user): the member who joined with this account, or null
//           - isInSingapore(lat, lng): both are numbers inside SINGAPORE
//           - needsNewTrip(previous, lat, lng): no trip yet, or it's 2 minutes old,
//             or the member has moved 150 m since
//           - tripFromHere(lat, lng, station): getPtRoute from here, leaving now, as the fields
//             to save; {} when OneMap fails, so the old trip is kept
function findMember(meetup, memberId) {
  return meetup.members.find((member) => String(member._id) === memberId) || null;
}

function findMyself(meetup, user) {
  return meetup.members.find((member) => member.userId === String(user._id)) || null;
}

function isInSingapore(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return (
    lat >= SINGAPORE.minLat && lat <= SINGAPORE.maxLat &&
    lng >= SINGAPORE.minLng && lng <= SINGAPORE.maxLng
  );
}

function needsNewTrip(previous, lat, lng) {
  if (!previous || !previous.etaUpdatedAt) return true;
  if (Date.now() - previous.etaUpdatedAt.getTime() >= TRIP_REFRESH_MS) return true;
  const from = { lat: previous.etaFromLat, lng: previous.etaFromLng };
  return distanceKm(from, { lat, lng }) >= TRIP_REFRESH_KM;
}

async function tripFromHere(lat, lng, station) {
  try {
    const now = msToSingapore(Date.now());
    const route = await getPtRoute({ lat, lng }, station, now.date, now.time);
    return {
      etaMinutes: route ? route.minutes : null, // null: OneMap found no route from here
      arriveAt: route ? route.arriveAt : '',
      steps: route ? route.steps : [],
      etaFromLat: lat,
      etaFromLng: lng,
      etaUpdatedAt: new Date(),
    };
  } catch (error) {
    console.warn('Live trip from OneMap failed:', error.message);
    return {};
  }
}

// TODO 3: getLive
//           - unknown code → 404; the logged-in user isn't a member → 403
//           - no confirmed meeting point → 400
//           - outside the live window → people: []; once it has ended, delete the locations too
//           - otherwise every shared location with the member's name (skip members who left),
//             and the requester's own steps as myRoute
exports.getLive = async (req, res) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }
    const me = findMyself(meetup, req.user);
    if (!me) {
      return res.status(403).json({ error: NOT_A_MEMBER });
    }
    const myMemberId = String(me._id);
    const station = meetup.finalStation;
    if (!station) {
      return res.status(400).json({ error: "The host hasn't confirmed a meeting point yet" });
    }

    const liveWindow = liveWindowStatus(meetup.date, meetup.time);
    const destination = { name: station.name, lat: station.lat, lng: station.lng };
    if (!liveWindow.isOpen) {
      if (liveWindow.hasEnded) await Location.deleteByCode(meetup.code);
      return res.json({ window: liveWindow, destination, people: [], myRoute: [], myMemberId });
    }

    const locations = await Location.findByCode(meetup.code);
    const people = [];
    let myRoute = [];
    for (const location of locations) {
      const member = findMember(meetup, location.memberId);
      if (!member) continue; // they left the meetup
      people.push({
        memberId: location.memberId,
        name: member.name,
        lat: location.lat,
        lng: location.lng,
        accuracyM: location.accuracyM,
        etaMinutes: location.etaMinutes,
        arriveAt: location.arriveAt,
        updatedAt: location.updatedAt,
      });
      if (location.memberId === myMemberId) myRoute = location.steps;
    }
    res.json({ window: liveWindow, destination, people, myRoute, myMemberId });
  } catch (error) {
    console.error('Error getting the live map:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// TODO 4: shareLocation, part 1: check the request
//           - lat and lng must be numbers inside Singapore → otherwise 400
//           - unknown code → 404; the logged-in user isn't a member → 403
//           - no confirmed meeting point → 400
//           - outside the live window → 403
// TODO 5: shareLocation, part 2: save the location, with a fresh trip when needsNewTrip says so,
//         then reply with the trip
exports.shareLocation = async (req, res) => {
  try {
    const { lat, lng, accuracyM } = req.body;
    if (!isInSingapore(lat, lng)) {
      return res.status(400).json({ error: 'Location must be a lat and lng inside Singapore' });
    }

    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }
    const me = findMyself(meetup, req.user);
    if (!me) {
      return res.status(403).json({ error: NOT_A_MEMBER });
    }
    const memberId = String(me._id);
    const station = meetup.finalStation;
    if (!station) {
      return res.status(400).json({ error: "The host hasn't confirmed a meeting point yet" });
    }
    const liveWindow = liveWindowStatus(meetup.date, meetup.time);
    if (!liveWindow.isOpen) {
      return res.status(403).json({
        error: `The live map is only open from ${liveWindow.opensTime} to ${liveWindow.closesTime}`,
      });
    }

    const previous = await Location.findOne(meetup.code, memberId);
    const trip = needsNewTrip(previous, lat, lng) ? await tripFromHere(lat, lng, station) : {};
    const saved = await Location.saveLocation(meetup.code, memberId, {
      lat,
      lng,
      accuracyM: typeof accuracyM === 'number' ? Math.round(accuracyM) : null,
      ...trip,
    });
    res.json({
      etaMinutes: saved.etaMinutes,
      arriveAt: saved.arriveAt,
      steps: saved.steps,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error('Error sharing a live location:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// TODO 6: stopSharing: delete the logged-in member's location → 200 { message }
//         (no 404 when there's nothing to delete: pressing Stop twice is fine)
exports.stopSharing = async (req, res) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }
    const me = findMyself(meetup, req.user);
    if (!me) {
      return res.status(403).json({ error: NOT_A_MEMBER });
    }
    await Location.deleteOne(meetup.code, String(me._id));
    res.json({ message: 'Stopped sharing' });
  } catch (error) {
    console.error('Error stopping live sharing:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
