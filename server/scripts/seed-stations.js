/*
  FILE:     scripts/seed-stations.js
  OWNER:    P3 (team-written)
  PURPOSE:  one-off script that loads candidate meeting points into MongoDB.
            Pitch: 10–15 central MRT stations from data/stations.json (P3 creates that file).
            Later: all MRT stations, plus bus interchanges found via LTA Bus Stops
            (descriptions containing "Int")
  RUN:      node scripts/seed-stations.js from server/
  TALKS TO: models/station-model.js, config/db.js, optionally services/onemap.js (coordinates)
*/

// TODO (P3)
