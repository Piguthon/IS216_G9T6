// Express router for /api/live (all routes need a login).

const express = require('express');
const router = express.Router();

const liveController = require('../controllers/live-controller');
const { requireAuth } = require('../middleware/auth');

router.get('/:code', requireAuth, liveController.getLive);
router.put('/:code', requireAuth, liveController.shareLocation);
router.delete('/:code', requireAuth, liveController.stopSharing);

module.exports = router;
