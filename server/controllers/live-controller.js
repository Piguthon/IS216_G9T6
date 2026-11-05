// Live map endpoints: members share where they are and see everyone's trip time to the meeting point.

const Meetup = require('../models/meetup-model');
const Location = require('../models/location-model');
const { getPtRoute, getDriveRoute } = require('../services/onemap');
const { distanceKm } = require('../utils/fairness');
const { msToSingapore } = require('../utils/meetup-date');
const { liveWindowStatus } = require('../utils/live-window');

const SINGAPORE = { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 };
const TRIP_REFRESH_MS = 2 * 60 * 1000;
const TRIP_REFRESH_KM = 0.15;
const NOT_A_MEMBER = 'Only members who joined with their account can use the live map';

// The member with this id, or null
function findMember(meetup, memberId) {
  return meetup.members.find((member) => String(member._id) === memberId) || null;
}

// The member who joined with this account, or null
function findMyself(meetup, user) {
  return meetup.members.find((member) => member.userId === String(user._id)) || null;
}

// Whether both are numbers inside Singapore
function isInSingapore(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  return (
    lat >= SINGAPORE.minLat && lat <= SINGAPORE.maxLat &&
    lng >= SINGAPORE.minLng && lng <= SINGAPORE.maxLng
  );
}

// No trip yet, or it is 2 minutes old, or the member has moved 150 m since
function needsNewTrip(previous, lat, lng) {
  if (!previous || !previous.etaUpdatedAt) return true;
  if (Date.now() - previous.etaUpdatedAt.getTime() >= TRIP_REFRESH_MS) return true;
  const from = { lat: previous.etaFromLat, lng: previous.etaFromLng };
  return distanceKm(from, { lat, lng }) >= TRIP_REFRESH_KM;
}

// The route from here by the member's travel mode, leaving now; {} when OneMap fails
async function tripFromHere(lat, lng, station, travelMode) {
  try {
    const now = msToSingapore(Date.now());
    const getRoute = travelMode === 'car' ? getDriveRoute : getPtRoute;
    const route = await getRoute({ lat, lng }, station, now.date, now.time);
    return {
      etaMinutes: route ? route.minutes : null,
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

// GET /:code: everyone's shared location and your route, inside the live window
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
      if (!member) continue;
      people.push({
        memberId: location.memberId,
        name: member.name,
        travelMode: member.travelMode,
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

// PUT /:code: saves your location and replies with your trip from here
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
    const trip = needsNewTrip(previous, lat, lng)
      ? await tripFromHere(lat, lng, station, me.travelMode)
      : {};
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

// DELETE /:code: deletes your location (pressing Stop twice is fine)
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
