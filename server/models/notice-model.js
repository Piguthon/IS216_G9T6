// Short messages for a user, shown on My Meetups until dismissed.
const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: mongoose.now }
});

const Notice = mongoose.model('Notice', noticeSchema, 'notices');

exports.createNotice = async function (userId, message) {
  return await Notice.create({ userId: userId, message: message });
};

// This user's notices, newest first
exports.findByUser = async function (userId) {
  return await Notice.find({ userId: userId }).sort({ createdAt: -1 });
};

// Removes a notice only if it belongs to this user
exports.deleteForUser = async function (id, userId) {
  return await Notice.findOneAndDelete({ _id: id, userId: userId });
};
