// Votes: one per member per kind; voting again moves the vote.

const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    memberId: { type: String, required: true },
    kind: { type: String, required: true, enum: ['station', 'venue'] },
    optionId: { type: String, required: true },
    optionName: { type: String, required: true, trim: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    address: { type: String, default: '' },
  },
  { timestamps: true }
);

voteSchema.index({ code: 1, memberId: 1, kind: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema, 'votes');

// Creates the member's vote for this kind, or moves it to a new option
exports.castVote = async function (code, memberId, kind, option) {
  return await Vote.findOneAndUpdate(
    { code, memberId, kind },
    option,
    { upsert: true, returnDocument: 'after' }
  );
};

exports.findByCode = async function (code) {
  return await Vote.find({ code }).lean();
};

// Removes every vote of one kind
exports.clearKind = async function (code, kind) {
  return await Vote.deleteMany({ code, kind });
};

exports.deleteByCode = async function (code) {
  return await Vote.deleteMany({ code });
};

exports.deleteByMember = async function (code, memberId) {
  return await Vote.deleteMany({ code, memberId });
};
