/*
  FILE:      routes/venues-routes.js
  OWNER:     S (team-written)
  PURPOSE:   Express router for /api/venues (mounted in server.js)
  ENDPOINTS: GET /api/venues?lat=&lng=&category=
  TALKS TO:  controllers/venues-controller.js
*/

const express = require('express');
const router = express.Router();

const venuesController = require('../controllers/venues-controller');
router.get('/', venuesController.getVenues);

module.exports = router;
