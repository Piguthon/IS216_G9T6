/*
  FILE:      routes/meetups-routes.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   Express router for /api/meetups (mounted in server.js)
  ENDPOINTS: POST /api/meetups (create)
             GET /api/meetups/:code (get one)
             POST /api/meetups/:code/members (join)
             PUT /api/meetups/:code/members/:memberId (set start point)
  TALKS TO:  controllers/meetups-controller.js
  REVISE:    Wk 5 Express router (blog-with-mongodb/routes)
*/
const express = require('express');
const router = express.Router();

// STEPS
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Require the meetups controller.
//         Example: Week 5/server/blog-with-mongodb/routes/blogs-routes.js
const meetupsController = require('../controllers/meetups-controller');
// TODO 2: Register the endpoints from the header, each pointing at its controller function.
//         Start with POST / and GET /:code, then POST /:code/members,
//         then PUT /:code/members/:memberId later.
router.post("/", meetupsController.createMeetup);
router.get("/:code", meetupsController.getMeetup);
router.post("/:code/members",meetupsController.joinMeetup);
router.put("/:code/members/:memberId",meetupsController.setStart);
router.put("/:code",meetupsController.updateMeetup);
router.delete("/:code",meetupsController.deleteMeetup);
router.delete("/:code/members/:memberId",meetupsController.leaveMeetup);

module.exports = router;
