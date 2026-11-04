/*
  FILE:      models/meetup-model.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   Mongoose schema and CRUD functions for meetups
  FIELDS:    as the Meetup shape, plus createdAt; members are embedded sub-documents
             Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                      members: [ { _id, name, start: { label, postal, lat, lng } | null,
                                   travelMode: 'transit' | 'car', ready, memberToken } ],
                      rankedAt: Date | null, leftSinceRanking: [ name ] }
             ranking (the host's saved fair meeting points) is left out of normal reads,
             because it is large: read it with findRanking
  FUNCTIONS: create, find by code, find by user, add member, update a member's start,
             travel mode or ready (locked once the host has worked out the fair meeting points),
             save and read the ranking, note who left since
  SECRET:    every new member gets a random memberToken. A guest sends it back in the
             X-Member-Token header to prove which member they are (middleware/member.js).
             Never send it to the client, except in the reply that created that member.
  REVISE:    Wk 5 blog-model.js (schema + exported CRUD functions)
*/

const crypto = require('node:crypto');
const mongoose = require('mongoose');

// newMemberToken(): a random secret for a new member, made the same way as session tokens
// (controllers/users-controller.js)
function newMemberToken() {
    return crypto.randomBytes(32).toString('hex');
}

// A member of a meetup. Mongoose gives every sub-document its own _id; that's the member id the
// frontend stores.
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
        },
        // Pressed "Confirm location": their start point and travel mode are final.
        // Changing either one sets this back to false.
        ready : {
            type : Boolean,
            default : false
        },
        // This member's secret (see SECRET above). Members from before it was added have none.
        memberToken : {
            type : String,
            default : null
        }
    }
)

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
    // The fair meeting points the host last worked out (controllers/ranking-controller.js):
    // { key, ranking, departure }. Only the host can recalculate; members read this saved copy.
    ranking : {
        type : mongoose.Schema.Types.Mixed,
        default : null,
        select : false
    },
    // Set once the host works out the fair meeting points. From then on nobody can join, and
    // members can't change their location; they can only leave.
    rankedAt : {
        type : Date,
        default : null
    },
    // Members who left since the host last worked them out, so the host knows to recalculate
    leftSinceRanking : {
        type : [String],
        default : []
    },
    createdAt : {
        type : Date,
        default : mongoose.now
    }
})

const Meetup = mongoose.model('Meetup', meetupSchema,'meetups');

exports.createMeetup = async function(data) {
    const newMeetup = {
        code : data.code,
        hostName : data.hostName,
        occasion : data.occasion,
        date : data.date,
        time : data.time,
        // members is optional (scripts/demo-live-map.js adds them afterwards with addMember)
        members : (data.members || []).map(member => ({ ...member, memberToken : newMemberToken() }))
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
        meetup.members.push({name : name, userId, memberToken : newMemberToken()});

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
    if (meetup.rankedAt) {
        throw new Error('Locked');
    }

    member.start = start;
    member.ready = false;
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
    if (meetup.rankedAt) {
        throw new Error('Locked');
    }

    member.travelMode = travelMode;
    member.ready = false;
    await meetup.save();

    return member;
};

// setMemberReady(code, memberId, ready): ready can only be true once the member has a start point
exports.setMemberReady = async function(code, memberId, ready) {
    const meetup = await Meetup.findOne({ code: code });
    if (!meetup) {
        throw new Error('Meetup not found');
    }

    const member = meetup.members.id(memberId);
    if (!member) {
        throw new Error('Member not found');
    }
    if (meetup.rankedAt) {
        throw new Error('Locked');
    }
    if (ready && !member.start) {
        throw new Error('Set a start point first');
    }

    member.ready = ready;
    await meetup.save();

    return member;
};

// saveRanking(code, ranking): the host's newly worked out fair meeting points
exports.saveRanking = async function(code, ranking) {
    return await Meetup.findOneAndUpdate(
        { code: code },
        { ranking: ranking, rankedAt: new Date(), leftSinceRanking: [] },
        { returnDocument: 'after' }
    );
};

// noteLeaver(code, name): someone left after the host worked out the fair meeting points
exports.noteLeaver = async function(code, name) {
    return await Meetup.findOneAndUpdate({ code: code }, { $push: { leftSinceRanking: name } });
};

// findRanking(code): the meetup with its saved ranking included
exports.findRanking = async function(code) {
    return await Meetup.findOne({ code: code }).select('+ranking');
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
