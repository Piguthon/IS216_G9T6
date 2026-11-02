/*
  FILE:      models/meetup-model.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   Mongoose schema and CRUD functions for meetups
  FIELDS:    as the Meetup shape, plus createdAt; members are embedded sub-documents
             Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                      members: [ { _id, name, start: { label, postal, lat, lng } | null,
                                   travelMode: 'transit' | 'car' } ] }
  FUNCTIONS: create, find by code, find by user, add member, update a member's start
             or travel mode
  REVISE:    Wk 5 blog-model.js (schema + exported CRUD functions)
*/

// STEPS
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Require Mongoose.
//         Example: Week 5/server/blog-with-mongodb/models/blog-model.js
const mongoose = require('mongoose');

// TODO 2: Define a member sub-schema with:
//           - name  (String, required, trimmed)
//           - start (an object { label, postal, lat, lng }, default null)
//         Tip: Mongoose gives every sub-document its own _id; that's the member id the
//         frontend stores.
const memberSchema = new mongoose.Schema(
    {
        userId: { type: String, default: null },
        name : {
            type : String,
            trim : true,
            required : true
        },
        start : {
            type : {
                label : String,
                postal : String,
                lat : Number,
                lng : Number
            },
            default : null

        },
        // How this member is getting there: used for their fair timings
        travelMode : {
            type : String,
            enum : ['transit', 'car'],
            default : 'transit'
        }
    }
)

// TODO 3: Define the meetup schema:
//           - code (String, required, unique)
//           - hostName, occasion, date ("YYYY-MM-DD"), time ("HH:MM"): all Strings, required
//           - members (an array of the member sub-schema)
//           - createdAt (Date, defaults to now)
const meetupSchema = new mongoose.Schema({
    code : {
        type : String,
        required : true,
        unique : true
    },
    hostName : {
        type : String,
        required : true
    },
    occasion : {
        type : String,
        required : true
    },
    date : {
        type : String,
        required : true
    },
    time : {
        type : String,
        required : true
    },
    members : [memberSchema],
    // The host's confirmed choices from group voting (controllers/votes-controller.js)
    finalStation : {
        type : new mongoose.Schema(
            { optionId : String, name : String, lat : Number, lng : Number },
            { _id : false }
        ),
        default : null
    },
    finalVenue : {
        type : new mongoose.Schema(
            { optionId : String, name : String, address : String, lat : Number, lng : Number },
            { _id : false }
        ),
        default : null
    },
    createdAt : {
        type : Date,
        default : mongoose.now
    }
})

// TODO 4: Create the model on the meetups collection, the same way blog-model.js creates
//         Blog on blogs.
const Meetup = mongoose.model('Meetup', meetupSchema,'meetups');

// TODO 5: Export these CRUD functions in the course style (exports.name = function ...),
//         each returning the Mongoose result:
//           - createMeetup(data)
//           - findByCode(code)
//           - addMember(code, name)
//           - setMemberStart(code, memberId, start)   (this one later)
exports.createMeetup = async function(data) {
    const newMeetup = {
        code : data.code,
        hostName : data.hostName,
        occasion : data.occasion,
        date : data.date,
        time : data.time,
        members : data.members
    };
    return await Meetup.create(newMeetup);
};

exports.findByCode = async function(code) {
    return await Meetup.findOne({code : code});
}

// findByUser(userId): every meetup this account is a member of
exports.findByUser = async function(userId) {
    return await Meetup.find({ 'members.userId' : userId });
}

exports.addMember = async function(code, name, userId = null) {
    try {
        const meetup = await Meetup.findOne({code : code});

        if (!meetup) {
            throw new Error('Meetup not found');
        }
        if (userId) {
            const existing = meetup.members.find(member => member.userId === userId);
            if (existing) return existing;
        }
        meetup.members.push({name : name, userId});

        const updatedMeetup = await meetup.save();
        
        return updatedMeetup.members[updatedMeetup.members.length-1];
    } catch(error) {
        console.error('Error adding members',error);
        throw error;
    }
}

// setMemberStart(code, memberId, start)
exports.setMemberStart = async function(code, memberId, start) {
    const meetup = await Meetup.findOne({ code: code });
    if (!meetup) {
        throw new Error('Meetup not found');
    }

    const member = meetup.members.id(memberId);
    if (!member) {
        throw new Error('Member not found');
    }

    member.start = start;
    await meetup.save();
    
    return member;
};

// setMemberMode(code, memberId, travelMode)
exports.setMemberMode = async function(code, memberId, travelMode) {
    const meetup = await Meetup.findOne({ code: code });
    if (!meetup) {
        throw new Error('Meetup not found');
    }

    const member = meetup.members.id(memberId);
    if (!member) {
        throw new Error('Member not found');
    }

    member.travelMode = travelMode;
    await meetup.save();

    return member;
};

// updateDetails(code, fields)
exports.updateDetails = async function(code, fields) {
    return await Meetup.findOneAndUpdate(
        { code: code },
        { 
            occasion: fields.occasion, 
            date: fields.date, 
            time: fields.time 
        },
        { new: true } // Returns the updated document
    );
};

// deleteByCode(code)
exports.deleteByCode = async function(code) {
    return await Meetup.findOneAndDelete({ code: code });
};

// removeMember(code, memberId)
exports.removeMember = async function(code, memberId) {
    const meetup = await Meetup.findOne({ code: code });
    if (!meetup) {
        throw new Error('Meetup not found');
    }

    meetup.members.pull(memberId);
    await meetup.save();
    
    return meetup;
};

// setFinalChoice(code, kind, choice): kind is 'station' or 'venue'; choice null clears it.
// A new meeting point clears the confirmed venue, because venues depend on the meeting point.
exports.setFinalChoice = async function(code, kind, choice) {
    const update = kind === 'station'
        ? { finalStation : choice, finalVenue : null }
        : { finalVenue : choice };
    return await Meetup.findOneAndUpdate({ code : code }, update, { returnDocument : 'after' });
}
