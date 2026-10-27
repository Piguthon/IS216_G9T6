/*
  FILE:      routes/votes-routes.js
  OWNER:     P4 (after the pitch) (team-written)
  PURPOSE:   Express router for /api/votes (mounted in server.js)
  ENDPOINTS: GET  /api/votes/:code?memberId=   tallies, my votes and the confirmed choices
             PUT  /api/votes/:code             cast or move a vote
             POST /api/votes/:code/confirm     host confirms the final choice (log in required)
             Tallies are refreshed on the client by polling (decided: no WebSockets)
*/

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const votesController = require('../controllers/votes-controller');

router.get('/:code', votesController.getVotes);
router.put('/:code', votesController.castVote);
router.post('/:code/confirm', requireAuth, votesController.confirmChoice);

module.exports = router;
