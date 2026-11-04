/*
  FILE:    models/vote-model.js
  OWNER:   P4 (team-written)
  PURPOSE: votes
  FIELDS:  meetup code, memberId, kind ('station' or 'venue'), option (id, name, and where it is
           so the host can confirm it), timestamps
           One vote per member per kind: voting again moves the vote
*/

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

// castVote: creates the member's vote for this kind, or moves it to a new option
// option: { optionId, optionName, lat, lng, address }
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

// clearKind: removes every vote of one kind (venue votes reset when the meeting point changes)
exports.clearKind = async function (code, kind) {
  return await Vote.deleteMany({ code, kind });
};

exports.deleteByCode = async function (code) {
  return await Vote.deleteMany({ code });
};

exports.deleteByMember = async function (code, memberId) {
  return await Vote.deleteMany({ code, memberId });
};
