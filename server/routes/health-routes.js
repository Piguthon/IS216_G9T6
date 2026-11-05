// Express router for /api/health, for an uptime monitor to ping.

const express = require('express');
const router = express.Router();

const healthController = require('../controllers/health-controller');

router.get('/', healthController.getHealth);

module.exports = router;
