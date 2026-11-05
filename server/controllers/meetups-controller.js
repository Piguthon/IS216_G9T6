// Meetup endpoints: validate input and reply with JSON and the right status code.

const Meetup = require('../models/meetup-model');
const Vote = require('../models/vote-model');
const Location = require('../models/location-model');
const Notice = require('../models/notice-model');
const User = require('../models/user-model');
const {getUniqueCode} = require('../utils/generate-code');
const { isAllowedMeetupDate, todayInSingapore } = require('../utils/meetup-date');
const { findCaller } = require('../middleware/member');

const FREQUENT_PEOPLE_SHOWN = 10;

// The other accounts this user has shared the most meetups with, at most 10
async function findFrequentPeople(userId) {
    const meetups = await Meetup.findByUser(userId);
    const counts = {};

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

    const users = await User.find({ _id: { $in: Object.keys(counts) } }).select('name');
    const people = users.map(user => ({
        userId: String(user._id),
        name: user.name,
        count: counts[String(user._id)],
    }));
    people.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return people.slice(0, FREQUENT_PEOPLE_SHOWN);
}

// A member as the API sends it: never the memberToken, and only the start label without withPlace
function toPublicMember(member, withPlace) {
    const shown = member.toObject();
    delete shown.memberToken;
    if (shown.start && !withPlace) {
        shown.start = { label: shown.start.label };
    }
    return shown;
}

// The meetup with every member made public as above
function toPublicMeetup(meetup, withPlace) {
    const shown = meetup.toObject();
    shown.members = meetup.members.map(member => toPublicMember(member, withPlace));
    return shown;
}

// POST /: the logged-in user hosts a new meetup, adding any people they ticked
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

        let added = [];
        if (memberUserIds.length > 0) {
            const frequent = await findFrequentPeople(hostId);
            added = frequent.filter(person => memberUserIds.includes(person.userId));
        }

        const code = await getUniqueCode();
        const members = [{name : hostName, userId: hostId}];
        for (const person of added) {
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

        try {
            const shownDate = date.split('-').reverse().join('-');
            for (const person of added) {
                await Notice.createNotice(person.userId, `${hostName} added you to ${occasion} on ${shownDate}.`);
            }
        } catch (error) {
            console.error("Error sending added-you notices:", error);
        }
        const shown = toPublicMeetup(result, true);
        shown.memberToken = result.members[0].memberToken;
        res.status(201).json(shown);

    }catch(error) {
        console.error("Error creating meetup:",error)
        res.status(500).json({ error: "Server error" });
    }
};
// GET /:code: the meetup, or 404 for an unknown code
exports.getMeetup = async (req,res) => {
    try {
        const code = req.params.code;
        let result = await Meetup.findByCode(code);
        if (!result) {
            return res.status(404).json({ error: "Unknown code" });
        }
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
// GET /frequent: the accounts the logged-in user meets most often
exports.getFrequentPeople = async (req, res) => {
    try {
        const people = await findFrequentPeople(String(req.user._id));
        res.json(people);
    } catch (error) {
        console.error('Error getting frequent people:', error);
        res.status(500).json({ error: "Server error" });
    }
};

// DELETE /notices/:id: the logged-in user dismisses one of their notices
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

// GET /mine: the logged-in user's current and past meetups, plus their notices
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
        current.sort((a, b) => when(a).localeCompare(when(b)));
        past.sort((a, b) => when(b).localeCompare(when(a)));
        res.json({ current, past, notices });
    } catch (error) {
        console.error('Error getting my meetups:', error);
        res.status(500).json({ error: "Server error" });
    }
};

// POST /:code/members: adds a member and replies 201 with them
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
        if (check.rankedAt) {
            return res.status(403).json({ error: "This meetup is closed to new members because the host has worked out the fair meeting points." });
        }
        let result = await Meetup.addMember(code,name,userId);
        const shown = toPublicMember(result, true);
        shown.memberToken = result.memberToken;
        res.status(201).json(shown);
    }catch(error) {
        console.error('Error joining meetup: ',error);
        res.status(500).json({ error: "Server error" });
    }
};

// PUT /:code/me: sets my start point
exports.setStart = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const { start } = req.body;

        if (!start || !start.label || typeof start.lat !== 'number' || typeof start.lng !== 'number') {
            return res.status(400).json({ error: "Invalid start point. Label, lat (number), and lng (number) are required." });
        }

        try {
            const updatedMember = await Meetup.setMemberStart(code, memberId, start);
            res.status(200).json(toPublicMember(updatedMember, true));
        } catch (error) {
            if (error.message === 'Meetup not found' || error.message === 'Member not found') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message === 'Locked') {
                return res.status(403).json({ error: "Locations are locked because the host has worked out the fair meeting points. You can still leave the meetup." });
            }
            throw error;
        }
    } catch (error) {
        console.error("Error setting start point:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// PUT /:code/me/mode: sets my travel mode
exports.setTravelMode = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const { travelMode } = req.body;

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
            throw error;
        }
    } catch (error) {
        console.error("Error setting travel mode:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// PUT /:code/me/ready: confirms my location, or undoes it
exports.setReady = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const { ready } = req.body;

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
            throw error;
        }
    } catch (error) {
        console.error("Error confirming location:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// PUT /:code: the host edits the meetup details
exports.updateMeetup = async (req, res) => {
    try {
        const code = req.params.code;
        const { occasion, date, time } = req.body;


        if (!occasion || !date || !time) {
            return res.status(400).json({ error: "Fields cannot be empty" });
        }

        if (!isAllowedMeetupDate(date)) {
            return res.status(400).json({ error: 'Choose a valid date that is today or later (Singapore time).' });
        }
        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

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

// DELETE /:code: the host deletes the meetup
exports.deleteMeetup = async (req, res) => {
    try {
        const code = req.params.code;

        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

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

// DELETE /:code/me: a member leaves the meetup
exports.leaveMeetup = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = String(req.member._id);
        const meetup = req.meetup;

        if (meetup.members && meetup.members.length > 0 && meetup.members[0]._id.toString() === memberId) {
            return res.status(400).json({ error: "The host must delete the meetup instead" });
        }

        const leaver = meetup.members.id(memberId);
        await Meetup.removeMember(code, memberId);
        await Vote.deleteByMember(code, memberId);
        await Location.deleteOne(code, memberId);

        const host = meetup.members[0];
        if (leaver && meetup.rankedAt && meetup.members.length - 1 === 1) {
            await Meetup.deleteByCode(code);
            await Vote.deleteByCode(code);
            await Location.deleteByCode(code);
            if (host.userId) {
                const date = meetup.date.split('-').reverse().join('-');
                await Notice.createNotice(
                    host.userId,
                    `${meetup.occasion} on ${date} was deleted because ${leaver.name} left and you were the only one left.`
                );
            }
            return res.status(200).json({ message: "Left meetup successfully", meetupDeleted: true });
        }

        if (leaver && meetup.rankedAt) {
            await Meetup.noteLeaver(code, leaver.name);
        }
        res.status(200).json({ message: "Left meetup successfully" });

    } catch (error) {
        console.error("Error leaving meetup:", error);
        res.status(500).json({ error: "Server error" });
    }
};

// DELETE /:code/members/:memberId/remove: the host removes a member
exports.removeMember = async (req, res) => {
    try {
        const code = req.params.code;
        const memberId = req.params.memberId;

        const meetup = await Meetup.findByCode(code);
        if (!meetup) {
            return res.status(404).json({ error: "Unknown code" });
        }

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
