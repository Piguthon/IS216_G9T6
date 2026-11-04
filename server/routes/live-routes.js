/*
  FILE:      routes/live-routes.js
  OWNER:     S (team-written)
  PURPOSE:   Express router for /api/live (mounted in server.js)
  ENDPOINTS: GET    /api/live/:code   the live map: window, destination, people, my route
             PUT    /api/live/:code   share my location (or move it)
             DELETE /api/live/:code   stop sharing (deletes my location)
             All three need a login, and the server works out which member you are from it
             The map refreshes on the client by polling (decided: no WebSockets)
  TALKS TO:  controllers/live-controller.js, middleware/auth.js
  REVISE:    Wk 5 Express router (blog-with-mongodb/routes)
*/

const express = require('express');
const router = express.Router();

const liveController = require('../controllers/live-controller');
const { requireAuth } = require('../middleware/auth');

router.get('/:code', requireAuth, liveController.getLive);
router.put('/:code', requireAuth, liveController.shareLocation);
router.delete('/:code', requireAuth, liveController.stopSharing);

module.exports = router;
