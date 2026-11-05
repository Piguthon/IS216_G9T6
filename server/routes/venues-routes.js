// Express router for /api/venues.

const express = require('express');
const router = express.Router();

const venuesController = require('../controllers/venues-controller');
router.get('/', venuesController.getVenues);

module.exports = router;
