/*
  FILE:    models/token-model.js
  OWNER:   I (team-written)
  PURPOSE: stores API tokens (OneMap) so a server restart reuses the token
*/
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },   // e.g. 'onemap'
  accessToken: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

const Token = mongoose.model('Token', tokenSchema, 'tokens');

exports.findToken = async function (name) {
  return await Token.findOne({ name: name });
};

exports.saveToken = async function (name, accessToken, expiresAt) {
  return await Token.findOneAndUpdate(
    { name: name },
    { accessToken: accessToken, expiresAt: expiresAt },
    { new: true, upsert: true }   // upsert = create it if it doesn't exist yet
  );
};