// Express router for /api/bus-arrival.

const express = require('express');
const router = express.Router();

const { getBusArrival } = require('../controllers/bus-controller');

router.get('/:stopCode', getBusArrival);

module.exports = router;
