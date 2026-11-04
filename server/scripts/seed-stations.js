/*
  FILE:     scripts/seed-stations.js
  OWNER:    P3 (team-written)
  PURPOSE:  one-off script that loads the candidate meeting points in data/stations.json (MRT
            stations and bus interchanges) into MongoDB. A station that's already there is
            updated, so it's safe to run again after the file changes.
  RUN:      node scripts/seed-stations.js from server/
  TALKS TO: models/station-model.js, config/db.js
*/

const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Station = require('../models/station-model');
const stations = require('../data/stations.json');

async function seedStations() {
  try {
    await connectDB();

    for (const station of stations) {
      const existingStation = await Station.findOne({
        stationId: station.stationId,
      });

      if (existingStation) {
        await Station.updateOne(
          { stationId: station.stationId },
          {
            name: station.name,
            type: station.type,
            lat: station.lat,
            lng: station.lng,
          },
        );
      } else {
        await Station.create(station);
      }
    }
  } catch (error) {
    console.error('Station seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
seedStations();
