/*
  FILE:      routes/bus-routes.js
  OWNER:     P4 (team-written)
  PURPOSE:   Express router for /api/bus-arrival (mounted in server.js)
  ENDPOINTS: GET /api/bus-arrival/:stopCode
  TALKS TO:  controllers/bus-controller.js
*/

const express = require('express');
const router = express.Router();

const { getBusArrival } = require('../controllers/bus-controller');

router.get('/:stopCode', getBusArrival);

module.exports = router;
