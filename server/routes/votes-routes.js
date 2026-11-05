// Express router for /api/votes.

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireMember } = require('../middleware/member');
const votesController = require('../controllers/votes-controller');

router.get('/:code', votesController.getVotes);
router.put('/:code', requireMember, votesController.castVote);
router.post('/:code/confirm', requireAuth, votesController.confirmChoice);

module.exports = router;
