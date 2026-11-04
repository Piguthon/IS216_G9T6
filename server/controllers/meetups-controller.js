/*
  FILE:      controllers/meetups-controller.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   handles the meetup endpoints; validates input and returns JSON with proper
             status codes (201 created, 400 bad input, 404 unknown code)
  FUNCTIONS: createMeetup (body { occasion, date, time, memberUserIds? } → 201 Meetup; the host
                           is the logged-in user, and each ticked frequent person is added
                           after them and gets a notice)
             getFrequentPeople (→ [ { userId, name, count } ], the accounts I meet most often)
             getMeetup (:code → Meetup; start points' postal and lat/lng only for members)
             joinMeetup (body { name } → 201 { _id, name, start: null, memberToken }, or 200 with
                         the existing member when a logged-in user rejoins, or a guest rejoins
                         with their X-Member-Token; a guest who reuses someone's name → 409)
             setStart, setTravelMode, setReady, leaveMeetup (PUT/DELETE /:code/me): requireMember
                         (middleware/member.js) has already worked out who req.member is
             setStart (body { start: { label, postal, lat, lng } } → updated member)
  DATA:      Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                      members: [ { _id, userId | null, name, start: { label, postal, lat, lng } | null,
                                   travelMode, ready } ] }
  SECRETS:   memberToken is never sent back, except to the request that created that member
             (createMeetup: the host's, joinMeetup: the new member's). Every reply with members
             goes through toPublicMember / toPublicMeetup, which remove it.
  TALKS TO:  models/meetup-model.js, models/notice-model.js, models/user-model.js,
             middleware/member.js
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
const Location = require('../models/location-model');
const Notice = require('../models/notice-model');
const User = require('../models/user-model');
const {getUniqueCode} = require('../utils/generate-code');
const { isAllowedMeetupDate, todayInSingapore } = require('../utils/meetup-date');
const { findCaller } = require('../middleware/member');

// How many people "Add people you often meet" lists on Create Meetup
const FREQUENT_PEOPLE_SHOWN = 10;

// findFrequentPeople(userId): the other accounts this user has shared meetups with, as
// [ { userId, name, count } ], most shared meetups first (ties by name), at most 10.
// count is meetups, not visits, so each meetup counts once per person. Guests are left out
// because they have no account, and so are accounts that have since been deleted.
async function findFrequentPeople(userId) {
    const meetups = await Meetup.findByUser(userId);
    const counts = {};   // userId → number of meetups shared with me

    for (const meetup of meetups) {
        const countedHere = [];
        for (const member of meetup.members) {
            const otherId = member.userId;
            if (!otherId || otherId === userId || countedHere.includes(otherId)) continue;
            countedHere.push(otherId);
            counts[otherId] = (counts[otherId] || 0) + 1;
        }
    }
    if (Object.keys(counts).length === 0) return [];

    // Each person's current account name, in case they renamed it since
    const users = await User.find({ _id: { $in: Object.keys(counts) } }).select('name');
    const people = users.map(user => ({
        userId: String(user._id),
        name: user.name,
        count: counts[String(user._id)],
    }));
    people.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return people.slice(0, FREQUENT_PEOPLE_SHOWN);
}

// toPublicMember(member, withPlace): a member as the API sends it. memberToken is always
// removed. Without withPlace the start point is only its label, so someone who just knows the
// code can't see where members start from (members see each other's on the results map).
function toPublicMember(member, withPlace) {
    const shown = member.toObject();
    delete shown.memberToken;
    if (shown.start && !withPlace) {
        shown.start = { label: shown.start.label };
    }
    return shown;
}

// toPublicMeetup(meetup, withPlace): the meetup with every member made public as above
function toPublicMeetup(meetup, withPlace) {
    const shown = meetup.toObject();
    shown.members = meetup.members.map(member => toPublicMember(member, withPlace));
    return shown;
}

// TODO 2: Write every handler as exports.name = async (req, res) => { ... } with try/catch.
//         In catch, log the error and reply 500 with JSON { error: "Server error" }.
//         Always reply with JSON, never res.send text.


// TODO 3: createMeetup
//           - reads hostName, occasion, date, time from req.body
//           - any missing → 400 { error: "..." }
//           - creates a short, readable meetup code (e.g. 6 characters; your choice of how)
//             and makes sure it isn't already used
//           - saves the meetup with the host as its first member (suggested)
//           - adds the people the host ticked (memberUserIds, optional) after the host, and
//             sends each of them a notice
//           - replies 201 with the saved meetup
exports.createMeetup = async (req,res) => {
    try {
        const hostName = req.user.name;
        const hostId = String(req.user._id);
        const occasion = req.body.occasion;
        const date = req.body.date;
        const time = req.body.time;
        const memberUserIds = req.body.memberUserIds || [];
        if (!hostName || !occasion || !date || !time) {
            return res.status(400).json({ error: "Field cannot be empty" });
        }
        if (!isAllowedMeetupDate(date)) {
            return res.status(400).json({ error: 'Choose a valid date that is today or later (Singapore time).' });
        }
        if (!Array.isArray(memberUserIds)) {
            return res.status(400).json({ error: "memberUserIds must be a list of user ids." });
        }

        // Only people from the host's frequent list can be added, so a host can't add any account
        // by its id. That list never has the host or a guest in it, and has each person once, so
        // duplicate ids and the host's own id are ignored too.
        let added = [];
        if (memberUserIds.length > 0) {
            const frequent = await findFrequentPeople(hostId);
            added = frequent.filter(person => memberUserIds.includes(person.userId));
        }

        const code = await getUniqueCode();
        const members = [{name : hostName, userId: hostId}];
        for (const person of added) {
            // They still choose their own start point and travel mode, then confirm their location
            members.push({ name: person.name, userId: person.userId, start: null, travelMode: 'transit', ready: false });
        }

        const meetup = {
            code : code,
            hostName : hostName,
            occasion : occasion,
            date : date,
            time : time,
            members : members
        }
        let result = await Meetup.createMeetup(meetup);

        // The meetup is already in each added person's My Meetups; this notice tells them why
        try {
            const shownDate = date.split('-').reverse().join('-');   // "06-11-2026"
            for (const person of added) {
                await Notice.createNotice(person.userId, `${hostName} added you to ${occasion} on ${shownDate}.`);
            }
        } catch (error) {
            // The meetup and its members are saved, so still reply 201
            console.error("Error sending added-you notices:", error);
        }
        // The host's secret is sent this once; the people added are logged in, so they don't need one
        const shown = toPublicMeetup(result, true);
        shown.memberToken = result.members[0].memberToken;
        res.status(201).json(shown);

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
        // Members (by session or X-Member-Token) also get the start points' postal and lat/lng.
        // A bad credential isn't an error here: they just get what everyone else gets.
        let caller = null;
        try {
            caller = await findCaller(req, result);
        } catch (error) {
            if (error.message !== 'Invalid session') throw error;
        }
        res.json(toPublicMeetup(result, Boolean(caller)));
    }catch(error) {
        console.error('Error retrieving meetup: ',error)
        res.status(500).json({ error: "Server error" });
    }
};
// getFrequentPeople (GET /frequent): the other accounts the logged-in user meets most often,
// for "Add people you often meet" on Create Meetup → [ { userId, name, count } ]
exports.getFrequentPeople = async (req, res) => {
    try {
        const people = await findFrequentPeople(String(req.user._id));
        res.json(people);
    } catch (error) {
        console.error('Error getting frequent people:', error);
        res.status(500).json({ error: "Server error" });
    }
};

// dismissNotice (DELETE /notices/:id): the logged-in user closes one of their notices
exports.dismissNotice = async (req, res) => {
    try {
        const notice = await Notice.deleteForUser(req.params.id, String(req.user._id));
        if (!notice) {
            return res.status(404).json({ error: "Notice not found" });
        }
        res.status(200).json({ message: "Notice dismissed" });
    } catch (error) {
        console.error('Error dismissing notice:', error);
        res.status(500).json({ error: "Server error" });
    }
};

// getMyMeetups (GET /mine): the logged-in user's meetups, split into current and past, plus
// their notices (e.g. a meetup that was deleted because everyone else left).
// A meetup stays current through its whole day in Singapore. Only list details are sent,
// not other members' start points.
exports.getMyMeetups = async (req, res) => {
    try {
        const userId = String(req.user._id);
        const meetups = await Meetup.findByUser(userId);
        const today = todayInSingapore();
        const current = [];
        const past = [];

        for (const meetup of meetups) {
            const me = meetup.members.find(member => member.userId === userId);
            const item = {
                code: meetup.code,
                occasion: meetup.occasion,
                date: meetup.date,
                time: meetup.time,
                hostName: meetup.hostName,
                memberCount: meetup.members.length,
                myMemberId: String(me._id),
                isHost: meetup.members[0]._id.equals(me._id),
                finalStation: meetup.finalStation,
                finalVenue: meetup.finalVenue,
            };
            if (meetup.date >= today) current.push(item);
            else past.push(item);
        }
        const notices = (await Notice.findByUser(userId)).map(notice => ({
            _id: String(notice._id),
            message: notice.message,
            createdAt: notice.createdAt,
        }));

        const when = (meetup) => `${meetup.date} ${meetup.time}`;
        current.sort((a, b) => when(a).localeCompare(when(b))); // soonest first
        past.sort((a, b) => when(b).localeCompare(when(a))); // most recent first
        res.json({ current, past, notices });
    } catch (error) {
        console.error('Error getting my meetups:', error);
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
            if (existing) return res.status(200).json(toPublicMember(existing, true));
        } else {
            // A guest who closed the tab gets back in with the same code and name (any capitals),
            // even after the meetup has closed to new members, but only from a browser that still
            // has their X-Member-Token. Otherwise anyone could take over a guest by typing their name.
            const sameName = name.trim().toLowerCase();
            const existing = check.members.find(member =>
                !member.userId && member.name.toLowerCase() === sameName);
            if (existing) {
                const memberToken = req.get('X-Member-Token') || '';
                if (memberToken && memberToken === existing.memberToken) {
                    return res.status(200).json(toPublicMember(existing, true));
                }
                return res.status(409).json({ error: "Someone in this meetup already uses that name. Choose another name." });
            }
        }
        // Closed once the host has worked out the fair meeting points
        if (check.rankedAt) {
            return res.status(403).json({ error: "This meetup is closed to new members because the host has worked out the fair meeting points." });
        }
        let result = await Meetup.addMember(code,name,userId);
        // The new member's secret is sent this once, so this browser can prove who they are
        const shown = toPublicMember(result, true);
        shown.memberToken = result.memberToken;
        res.status(201).json(shown);
    }catch(error) {
        console.error('Error joining meetup: ',error);
        res.status(500).json({ error: "Server error" });
    }
};

// setStart (PUT /:code/me)
exports.setStart = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const { start } = req.body;

        // Validation
        if (!start || !start.label || typeof start.lat !== 'number' || typeof start.lng !== 'number') {
            return res.status(400).json({ error: "Invalid start point. Label, lat (number), and lng (number) are required." });
        }

        try {
            const updatedMember = await Meetup.setMemberStart(code, memberId, start);
            res.status(200).json(toPublicMember(updatedMember, true));
        } catch (error) {
            // Check if the error was thrown by our model for missing data
            if (error.message === 'Meetup not found' || error.message === 'Member not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Locked') {
                return res.status(403).json({ error: "Locations are locked because the host has worked out the fair meeting points. You can still leave the meetup." });
            }
            throw error; // Let the outer catch handle unexpected errors
        }
    } catch (error) {
        console.error("Error setting start point:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// setTravelMode (PUT /:code/me/mode)
exports.setTravelMode = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const { travelMode } = req.body;

        // Validation
        if (travelMode !== 'transit' && travelMode !== 'car') {
            return res.status(400).json({ error: "Travel mode must be transit or car." });
        }

        try {
            const updatedMember = await Meetup.setMemberMode(code, memberId, travelMode);
            res.status(200).json(toPublicMember(updatedMember, true));
        } catch (error) {
            if (error.message === 'Meetup not found' || error.message === 'Member not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Locked') {
                return res.status(403).json({ error: "Locations are locked because the host has worked out the fair meeting points. You can still leave the meetup." });
            }
            throw error; // Let the outer catch handle unexpected errors
        }
    } catch (error) {
        console.error("Error setting travel mode:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// setReady (PUT /:code/me/ready): "Confirm location", or undo it with ready false
exports.setReady = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const { ready } = req.body;

        // Validation
        if (typeof ready !== 'boolean') {
            return res.status(400).json({ error: "Ready must be true or false." });
        }

        try {
            const updatedMember = await Meetup.setMemberReady(code, memberId, ready);
            res.status(200).json(toPublicMember(updatedMember, true));
        } catch (error) {
            if (error.message === 'Meetup not found' || error.message === 'Member not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Locked') {
                return res.status(403).json({ error: "Locations are locked because the host has worked out the fair meeting points. You can still leave the meetup." });
            }
            if (error.message === 'Set a start point first') {
                return res.status(400).json({ error: error.message });
            }
            throw error; // Let the outer catch handle unexpected errors
        }
    } catch (error) {
        console.error("Error confirming location:", error);
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
        res.status(200).json(toPublicMeetup(updatedMeetup, true));

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
        await Location.deleteByCode(code);
        res.status(200).json({ message: "Meetup deleted successfully" });

    } catch (error) {
        console.error("Error deleting meetup:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// leaveMeetup (DELETE /:code/me): requireMember has already loaded the meetup (404 if unknown)
exports.leaveMeetup = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const meetup = req.meetup;

        // Check if the requester is the host (first member)
        if (meetup.members && meetup.members.length > 0 && meetup.members[0]._id.toString() === memberId) {
            return res.status(400).json({ error: "The host must delete the meetup instead" });
        }

        const leaver = meetup.members.id(memberId);
        await Meetup.removeMember(code, memberId);
        await Vote.deleteByMember(code, memberId);
        await Location.deleteOne(code, memberId);

        // Once the fair meeting points are worked out nobody new can join, so if only the host is
        // left the meetup is over: delete it and tell the host on their My Meetups page
        const host = meetup.members[0];
        if (leaver && meetup.rankedAt && meetup.members.length - 1 === 1) {
            await Meetup.deleteByCode(code);
            await Vote.deleteByCode(code);
            await Location.deleteByCode(code);
            if (host.userId) {
                const date = meetup.date.split('-').reverse().join('-');   // "06-11-2026"
                await Notice.createNotice(
                    host.userId,
                    `${meetup.occasion} on ${date} was deleted because ${leaver.name} left and you were the only one left.`
                );
            }
            return res.status(200).json({ message: "Left meetup successfully", meetupDeleted: true });
        }

        // Tell the host, so they can recalculate without this member
        if (leaver && meetup.rankedAt) {
            await Meetup.noteLeaver(code, leaver.name);
        }
        res.status(200).json({ message: "Left meetup successfully" });

    } catch (error) {
        console.error("Error leaving meetup:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// removeMember (DELETE /:code/members/:memberId/remove): the host removes someone, so one
// inactive member can't hold up the whole group
exports.removeMember = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = req.params.memberId;

        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

        // Check if the requester is the host (first member)
        const host = meetup.members[0];
        if (!host || host.userId !== String(req.user._id)) {
            return res.status(403).json({ error: "Only the host can remove members" });
        }
        if (host._id.toString() === memberId) {
            return res.status(400).json({ error: "The host must delete the meetup instead" });
        }
        if (!meetup.members.id(memberId)) {
            return res.status(404).json({ error: "Member not found" });
        }

        await Meetup.removeMember(code, memberId);
        await Vote.deleteByMember(code, memberId);
        await Location.deleteOne(code, memberId);
        res.status(200).json({ message: "Member removed" });

    } catch (error) {
        console.error("Error removing member:", error);
        res.status(500).json({ error: "Server error" });
    }
};
