/*
  FILE:      routes/ranking-routes.js
  OWNER:     P3 (team-written)
  PURPOSE:   Express router for /api/ranking (mounted in server.js)
  ENDPOINTS: GET /api/ranking/:code, GET /api/ranking/:code/leave-times
  TALKS TO:  controllers/ranking-controller.js
*/

const express = require('express');
const router = express.Router();

// TODO (P3): register the routes listed above
const rankingController = require('../controllers/ranking-controller');
router.get('/:code', rankingController.getRanking);
router.get('/:code/leave-times', rankingController.getLeaveTimes);

module.exports = router;
