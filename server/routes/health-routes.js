// routes/health-routes.js
// GET /api/health - for an uptime monitor to ping (mounted in server.js).
// Follows the usage example at the bottom of services/onemap.js.

const express = require('express');
const { tokenStatus } = require('../services/onemap');

const router = express.Router();

router.get('/', async (req, res) => {
  const onemapStatus = await tokenStatus();
  res.status(onemapStatus.ok ? 200 : 503).json({ onemap: onemapStatus });
});

module.exports = router;
