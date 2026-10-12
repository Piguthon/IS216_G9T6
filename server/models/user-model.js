/*
  FILE:    models/user-model.js
  OWNER:   P1 (after the pitch) (team-written)
  PURPOSE: user accounts
  FIELDS:  name, email (unique), passwordHash, sessionToken,
           savedLocations [ { label, postal, lat, lng } ], favourites.
           Never store plain passwords
*/

const mongoose = require('mongoose');

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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('User', userSchema);
