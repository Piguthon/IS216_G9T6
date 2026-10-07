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
const {getUniqueCode} = require('../utils/generate-code');

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
        const hostName = req.body.hostName;
        const occasion = req.body.occasion;
        const date = req.body.date;
        const time = req.body.time;
        if (!hostName || !occasion || !date || !time) {
            return res.status(400).json({ error: "Field cannot be empty" });
        }
        const code = await getUniqueCode();
        
        const meetup = {
            code : code,
            hostName : hostName,
            occasion : occasion,
            date : date,
            time : time,
            members : [{name : hostName}]
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
        const name = req.body.name;
        const code = req.params.code;
        if (!name) {
            return res.status(400).json({ error: "Field cannot be empty" });
        }
        let check = await Meetup.findByCode(code);
        if (!check) {
            return res.status(404).json({ error: "Unknown code" });
        }
        let result = await Meetup.addMember(code,name);
        res.status(201).json(result);
    }catch(error) {
        console.error('Error joining meetup: ',error);
        res.status(500).json({ error: "Server error" });
    }
};

// TODO 6 (later, with AddressSearch): setStart
//           - body { start: { label, postal, lat, lng } } → replies with the updated member
exports.setStart = async (req,res) => {

};
// TIP: test each handler with the Postman collection in server/postman/ before touching
//      the frontend.
