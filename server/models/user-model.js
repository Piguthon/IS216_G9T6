/*
  FILE:    models/user-model.js
  OWNER:   JX (team-written)
  PURPOSE: user accounts
  FIELDS:  name, email (unique), passwordHash, sessionToken,
           savedLocations [ { label, postal, lat, lng } ], favourites.
           Never store plain passwords
*/

const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 60 },
  address: { type: String, required: true, trim: true, maxlength: 300 },
  postal: { type: String, default: '' },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    sessionToken: {
      type: String,
      select: false,
    },
    savedLocations: [locationSchema],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('User', userSchema);
