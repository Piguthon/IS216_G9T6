// Express router for /api/meetups.
const express = require('express');
const router = express.Router();

const meetupsController = require('../controllers/meetups-controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireMember } = require('../middleware/member');

router.post("/", requireAuth, meetupsController.createMeetup);
router.get("/mine", requireAuth, meetupsController.getMyMeetups); // must stay above /:code
router.get("/frequent", requireAuth, meetupsController.getFrequentPeople); // must stay above /:code
router.delete("/notices/:id", requireAuth, meetupsController.dismissNotice);
router.get("/:code", meetupsController.getMeetup);
router.post("/:code/members", optionalAuth, meetupsController.joinMeetup);
router.put("/:code/me", requireMember, meetupsController.setStart);
router.put("/:code/me/mode", requireMember, meetupsController.setTravelMode);
router.put("/:code/me/ready", requireMember, meetupsController.setReady);
router.put("/:code", requireAuth, meetupsController.updateMeetup);
router.delete("/:code",requireAuth, meetupsController.deleteMeetup);
router.delete("/:code/me", requireMember, meetupsController.leaveMeetup);
router.delete("/:code/members/:memberId/remove",requireAuth,meetupsController.removeMember);

module.exports = router;
