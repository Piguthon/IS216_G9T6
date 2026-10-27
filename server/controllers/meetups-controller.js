/*
  FILE:      controllers/meetups-controller.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   handles the meetup endpoints; validates input and returns JSON with proper
             status codes (201 created, 400 bad input, 404 unknown code)
  FUNCTIONS: createMeetup (body { hostName, occasion, date, time } → 201 Meetup)
             getMeetup (:code → Meetup)
             joinMeetup (body { name } → 201 { _id, name, start: null })
             setStart (body { start: { label, postal, lat, lng } } → updated member)
  DATA:      Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                      members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  TALKS TO:  models/meetup-model.js
  REVISE:    Wk 5 blogs-controller.js pattern (exports.fn = async (req, res) => {} with try/catch)
  DONE WHEN:
    - [ ] each endpoint works in Postman
    - [ ] errors return JSON messages
    - [ ] meetup codes are short, readable and unique
*/

// STEPS
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Require the meetup model.
//         Example: Week 5/server/blog-with-mongodb/controllers/blogs-controller.js
const Meetup = require('../models/meetup-model');
const Vote = require('../models/vote-model');
const {getUniqueCode} = require('../utils/generate-code');
const { isAllowedMeetupDate } = require('../utils/meetup-date');

// TODO 2: Write every handler as exports.name = async (req, res) => { ... } with try/catch.
//         In catch, log the error and reply 500 with JSON { error: "Server error" }.
//         Always reply with JSON, never res.send text.


// TODO 3: createMeetup
//           - reads hostName, occasion, date, time from req.body
//           - any missing → 400 { error: "..." }
//           - creates a short, readable meetup code (e.g. 6 characters; your choice of how)
//             and makes sure it isn't already used
//           - saves the meetup with the host as its first member (suggested)
//           - replies 201 with the saved meetup
exports.createMeetup = async (req,res) => {
    try {
        const hostName = req.user.name;
        const occasion = req.body.occasion;
        const date = req.body.date;
        const time = req.body.time;
        if (!hostName || !occasion || !date || !time) {
            return res.status(400).json({ error: "Field cannot be empty" });
        }
        if (!isAllowedMeetupDate(date)) {
            return res.status(400).json({ error: 'Choose a valid date that is today or later (Singapore time).' });
        }
        const code = await getUniqueCode();
        
        const meetup = {
            code : code,
            hostName : hostName,
            occasion : occasion,
            date : date,
            time : time,
            members : [{name : hostName, userId: String(req.user._id)}]
        }
        let result = await Meetup.createMeetup(meetup);
        res.status(201).json(result);

    }catch(error) {
        console.error("Error creating meetup:",error)
        res.status(500).json({ error: "Server error" });
    }
};
// TODO 4: getMeetup
//           - code from req.params → 404 { error } if not found, otherwise the meetup
exports.getMeetup = async (req,res) => {
    try {
        const code = req.params.code;
        let result = await Meetup.findByCode(code);
        if (!result) {
            return res.status(404).json({ error: "Unknown code" });
        }
        res.json(result);
    }catch(error) {
        console.error('Error retrieving meetup: ',error)
        res.status(500).json({ error: "Server error" });
    }
};
// TODO 5: joinMeetup
//           - name from the body (required → 400)
//           - unknown code → 404
//           - adds the member, replies 201 with the new member (including its _id)
exports.joinMeetup = async (req,res) => {
    try {
        const name = req.user ? req.user.name : req.body.name;
        const userId = req.user ? String(req.user._id) : null;
        const code = req.params.code;
        if (!name) {
            return res.status(400).json({ error: "Field cannot be empty" });
        }
        let check = await Meetup.findByCode(code);
        if (!check) {
            return res.status(404).json({ error: "Unknown code" });
        }
        if (userId) {
            const existing = check.members.find(member => member.userId === userId);
            if (existing) return res.status(200).json(existing);
        }
        let result = await Meetup.addMember(code,name,userId);
        res.status(201).json(result);
    }catch(error) {
        console.error('Error joining meetup: ',error);
        res.status(500).json({ error: "Server error" });
    }
};

// setStart (PUT /:code/members/:memberId)
exports.setStart = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = req.params.memberId;
        const { start } = req.body;

        // Validation
        if (!start || !start.label || typeof start.lat !== 'number' || typeof start.lng !== 'number') {
            return res.status(400).json({ error: "Invalid start point. Label, lat (number), and lng (number) are required." });
        }

        try {
            const updatedMember = await Meetup.setMemberStart(code, memberId, start);
            res.status(200).json(updatedMember);
        } catch (error) {
            // Check if the error was thrown by our model for missing data
            if (error.message === 'Meetup not found' || error.message === 'Member not found') {
                return res.status(404).json({ error: error.message });
            }
            throw error; // Let the outer catch handle unexpected errors
        }
    } catch (error) {
        console.error("Error setting start point:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// updateMeetup (PUT /:code)
exports.updateMeetup = async (req, res) => {
    try {
        const code = req.params.code;
        const { occasion, date, time } = req.body;


        // Validation for required fields
        if (!occasion || !date || !time) {
            return res.status(400).json({ error: "Fields cannot be empty" });
        }

        if (!isAllowedMeetupDate(date)) {
            return res.status(400).json({ error: 'Choose a valid date that is today or later (Singapore time).' });
        }
        // Find the meetup first to check the host
        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

        // Check if the requester is the host (first member)
        const host = meetup.members[0];
        if (!host || host.userId !== String(req.user._id)) {
            return res.status(403).json({ error: "Only the host can edit the meetup" });
        }

        const updatedMeetup = await Meetup.updateDetails(code, { occasion, date, time });
        res.status(200).json(updatedMeetup);

    } catch (error) {
        console.error("Error updating meetup:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// deleteMeetup (DELETE /:code)
exports.deleteMeetup = async (req, res) => {
    try {
        const code = req.params.code;

        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

        // Check if the requester is the host (first member)
        const host = meetup.members[0];
        if (!host || host.userId !== String(req.user._id)) {
            return res.status(403).json({ error: "Only the host can delete the meetup" });
        }

        await Meetup.deleteByCode(code);
        await Vote.deleteByCode(code);
        res.status(200).json({ message: "Meetup deleted successfully" });

    } catch (error) {
        console.error("Error deleting meetup:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// leaveMeetup (DELETE /:code/members/:memberId)
exports.leaveMeetup = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = req.params.memberId;

        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

        // Check if the requester is the host (first member)
        if (meetup.members && meetup.members.length > 0 && meetup.members[0]._id.toString() === memberId) {
            return res.status(400).json({ error: "The host must delete the meetup instead" });
        }

        await Meetup.removeMember(code, memberId);
        await Vote.deleteByMember(code, memberId);
        res.status(200).json({ message: "Left meetup successfully" });

    } catch (error) {
        console.error("Error leaving meetup:", error);
        res.status(500).json({ error: "Server error" });
    }
};
