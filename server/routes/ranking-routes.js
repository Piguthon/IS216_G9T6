/*
  FILE:      routes/ranking-routes.js
  OWNER:     P3 (team-written)
  PURPOSE:   Express router for /api/ranking (mounted in server.js)
  ENDPOINTS: GET /api/ranking/:code (the host's saved ranking, for everyone),
             POST /api/ranking/:code (the host works it out; logged in),
             GET /api/ranking/:code/leave-times
  TALKS TO:  controllers/ranking-controller.js
*/

const express = require('express');
const router = express.Router();

// TODO (P3): register the routes listed above
const rankingController = require('../controllers/ranking-controller');
const { requireAuth } = require('../middleware/auth');
router.get('/:code', rankingController.getRanking);
router.post('/:code', requireAuth, rankingController.calculateRanking);
router.get('/:code/leave-times', rankingController.getLeaveTimes);

module.exports = router;
