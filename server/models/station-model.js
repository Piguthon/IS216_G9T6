/*
  FILE:    models/station-model.js
  OWNER:   P3 (team-written)
  PURPOSE: candidate meeting points (MRT stations, and later bus interchanges)
  FIELDS:  stationId, name, type (mrt or interchange), lat, lng
*/

const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  stationId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['mrt', 'interchange'],
  },
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
  },
});

module.exports = mongoose.model('Station', stationSchema, 'stations');
