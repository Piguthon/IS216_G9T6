/*
  FILE:      routes/live-routes.js
  OWNER:     S (team-written)
  PURPOSE:   Express router for /api/live (mounted in server.js)
  ENDPOINTS: GET    /api/live/:code?memberId=   the live map: window, destination, people, my route
             PUT    /api/live/:code/:memberId    share my location (or move it)
             DELETE /api/live/:code/:memberId    stop sharing (deletes my location)
             The map refreshes on the client by polling (decided: no WebSockets)
  TALKS TO:  controllers/live-controller.js
  REVISE:    Wk 5 Express router (blog-with-mongodb/routes)
*/

const express = require('express');
const router = express.Router();

// STEPS

// TODO 1: Require the live controller.
const liveController = require('../controllers/live-controller');

// TODO 2: Register the endpoints from the header, each pointing at its controller function.
router.get('/:code', liveController.getLive);
router.put('/:code/:memberId', liveController.shareLocation);
router.delete('/:code/:memberId', liveController.stopSharing);

module.exports = router;
