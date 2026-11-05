// Express router for /api/ranking.

const express = require('express');
const router = express.Router();

const rankingController = require('../controllers/ranking-controller');
const { requireAuth } = require('../middleware/auth');
router.get('/:code', rankingController.getRanking);
router.post('/:code', requireAuth, rankingController.calculateRanking);
router.get('/:code/leave-times', rankingController.getLeaveTimes);

module.exports = router;
