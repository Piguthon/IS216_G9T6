/*
  FILE:    models/location-model.js
  OWNER:   S (team-written)
  PURPOSE: members' live locations for the live map, one per member per meetup
  FIELDS:  meetup code, memberId, lat, lng, accuracyM (how sure the phone is, in metres),
           the latest trip to the meeting point (etaMinutes, arriveAt "HH:MM", steps),
           where and when that trip was worked out (etaFromLat, etaFromLng, etaUpdatedAt),
           timestamps (updatedAt is when the location last came in)
  PRIVACY: MongoDB deletes a location by itself 2 hours after its last update (TTL index), so
           nothing is kept after the meetup, even if nobody presses Stop
  REVISE:  Wk 5 blog-model.js (schema + exported CRUD functions) · vote-model.js (upsert)
*/

// STEPS

// TODO 1: Require Mongoose.
const mongoose = require('mongoose');

// TODO 2: Define the location schema, with { timestamps: true }:
//           - code, memberId (Strings, required)
//           - lat, lng (Numbers, required), accuracyM (Number, default null)
//           - etaMinutes (Number, default null), arriveAt (String, default ''),
//             steps (Array, default []): the trip from here to the meeting point
//           - etaFromLat, etaFromLng (Numbers, default null), etaUpdatedAt (Date, default null)
const locationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    memberId: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracyM: { type: Number, default: null },
    etaMinutes: { type: Number, default: null },
    arriveAt: { type: String, default: '' },
    steps: { type: Array, default: [] },
    etaFromLat: { type: Number, default: null },
    etaFromLng: { type: Number, default: null },
    etaUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TODO 3: Add two indexes:
//           - one location per member per meetup (unique, like vote-model.js)
//           - a TTL index on updatedAt, so MongoDB deletes a location 2 hours after it stops
//             updating (https://www.mongodb.com/docs/manual/core/index-ttl/)
const TWO_HOURS_IN_SECONDS = 2 * 60 * 60;
locationSchema.index({ code: 1, memberId: 1 }, { unique: true });
locationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: TWO_HOURS_IN_SECONDS });

// TODO 4: Create the model on the locations collection.
const Location = mongoose.model('Location', locationSchema, 'locations');

// TODO 5: Export these functions, each returning the Mongoose result:
//           - saveLocation(code, memberId, fields): creates the member's location, or updates it
//           - findByCode(code), findOne(code, memberId)
//           - deleteOne(code, memberId), deleteByCode(code)
exports.saveLocation = async function (code, memberId, fields) {
  return await Location.findOneAndUpdate(
    { code, memberId },
    fields,
    { upsert: true, returnDocument: 'after' }
  );
};

exports.findByCode = async function (code) {
  return await Location.find({ code }).lean();
};

exports.findOne = async function (code, memberId) {
  return await Location.findOne({ code, memberId }).lean();
};

exports.deleteOne = async function (code, memberId) {
  return await Location.deleteOne({ code, memberId });
};

exports.deleteByCode = async function (code) {
  return await Location.deleteMany({ code });
};
