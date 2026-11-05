// Script that loads data/stations.json into MongoDB.

const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '../.env'),
});

const mongoose = require('mongoose');
const Station = require('../models/station-model');
const stations = require('../data/stations.json');

async function seedStations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

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
