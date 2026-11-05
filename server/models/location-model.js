// Members' live locations for the live map, one per member per meetup.

const mongoose = require('mongoose');

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

const TWO_HOURS_IN_SECONDS = 2 * 60 * 60;
locationSchema.index({ code: 1, memberId: 1 }, { unique: true });
locationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: TWO_HOURS_IN_SECONDS });

const Location = mongoose.model('Location', locationSchema, 'locations');

// Creates the member's location, or updates it
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
