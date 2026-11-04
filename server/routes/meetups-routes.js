/*
  FILE:      routes/meetups-routes.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   Express router for /api/meetups (mounted in server.js)
  ENDPOINTS: POST /api/meetups (create, optionally adding people from my frequent list)
             GET /api/meetups/mine (the logged-in user's current and past meetups, and notices)
             GET /api/meetups/frequent (the accounts I've shared the most meetups with)
             DELETE /api/meetups/notices/:id (dismiss one of my notices)
             GET /api/meetups/:code (get one; start points' postal and lat/lng only for members)
             POST /api/meetups/:code/members (join)
             PUT /api/meetups/:code/me (set my start point)
             PUT /api/meetups/:code/me/mode (set my travel mode)
             PUT /api/meetups/:code/me/ready (confirm my location, or undo it)
             DELETE /api/meetups/:code/me (leave)
             DELETE /api/meetups/:code/members/:memberId/remove (host removes a member)
             The /me routes use requireMember (middleware/member.js): the server works out which
             member "me" is from the session or the X-Member-Token header, never from the URL
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
const { requireAuth } = require('../middleware/auth');
const { requireMember } = require('../middleware/member');
// TODO 2: Register the endpoints from the header, each pointing at its controller function.
//         Start with POST / and GET /:code, then POST /:code/members,
//         then PUT /:code/members/:memberId later.
router.post("/", requireAuth, meetupsController.createMeetup);
router.get("/mine", requireAuth, meetupsController.getMyMeetups); // must stay above /:code
router.get("/frequent", requireAuth, meetupsController.getFrequentPeople); // must stay above /:code
router.delete("/notices/:id", requireAuth, meetupsController.dismissNotice);
router.get("/:code", meetupsController.getMeetup);
router.post("/:code/members", (req, res, next) => {
    if (req.get('Authorization')) return requireAuth(req, res, next);
    next();
}, meetupsController.joinMeetup);
router.put("/:code/me", requireMember, meetupsController.setStart);
router.put("/:code/me/mode", requireMember, meetupsController.setTravelMode);
router.put("/:code/me/ready", requireMember, meetupsController.setReady);
router.put("/:code", requireAuth, meetupsController.updateMeetup);
router.delete("/:code",requireAuth, meetupsController.deleteMeetup);
router.delete("/:code/me", requireMember, meetupsController.leaveMeetup);
router.delete("/:code/members/:memberId/remove",requireAuth,meetupsController.removeMember);

module.exports = router;
