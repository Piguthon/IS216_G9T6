/*
  FILE:    models/notice-model.js
  OWNER:   JS (team-written)
  PURPOSE: short messages for a logged-in user, shown on their My Meetups page until they dismiss
           them, e.g. that a meetup was deleted because everyone else left
  FIELDS:  Notice { userId, message, createdAt }
*/
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

// findByUser(userId): this user's notices, newest first
exports.findByUser = async function (userId) {
  return await Notice.find({ userId: userId }).sort({ createdAt: -1 });
};

// deleteForUser(id, userId): only removes the notice if it belongs to this user
exports.deleteForUser = async function (id, userId) {
  return await Notice.findOneAndDelete({ _id: id, userId: userId });
};
