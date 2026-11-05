// Mongoose schema and CRUD functions for meetups.

const crypto = require('node:crypto');
const mongoose = require('mongoose');

// A random secret for a new member
function newMemberToken() {
    return crypto.randomBytes(32).toString('hex');
}

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
        travelMode : {
            type : String,
            enum : ['transit', 'car'],
            default : 'transit'
        },
        ready : {
            type : Boolean,
            default : false
        },
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
    ranking : {
        type : mongoose.Schema.Types.Mixed,
        default : null,
        select : false
    },
    rankedAt : {
        type : Date,
        default : null
    },
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
        members : (data.members || []).map(member => ({ ...member, memberToken : newMemberToken() }))
    };
    return await Meetup.create(newMeetup);
};

exports.findByCode = async function(code) {
    return await Meetup.findOne({code : code});
}

// Every meetup this account is a member of
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

// Sets a member's start point
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

// Sets a member's travel mode
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

// Sets whether a member has confirmed; only possible once they have a start point
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

// Saves the host's newly worked out fair meeting points
exports.saveRanking = async function(code, ranking) {
    return await Meetup.findOneAndUpdate(
        { code: code },
        { ranking: ranking, rankedAt: new Date(), leftSinceRanking: [] },
        { returnDocument: 'after' }
    );
};

// Notes someone who left after the fair meeting points were worked out
exports.noteLeaver = async function(code, name) {
    return await Meetup.findOneAndUpdate({ code: code }, { $push: { leftSinceRanking: name } });
};

// The meetup with its saved ranking included
exports.findRanking = async function(code) {
    return await Meetup.findOne({ code: code }).select('+ranking');
};

// Updates the meetup's details
exports.updateDetails = async function(code, fields) {
    return await Meetup.findOneAndUpdate(
        { code: code },
        { 
            occasion: fields.occasion, 
            date: fields.date, 
            time: fields.time 
        },
        { new: true }
    );
};

// Deletes a meetup
exports.deleteByCode = async function(code) {
    return await Meetup.findOneAndDelete({ code: code });
};

// Removes a member from a meetup
exports.removeMember = async function(code, memberId) {
    const meetup = await Meetup.findOne({ code: code });
    if (!meetup) {
        throw new Error('Meetup not found');
    }

    meetup.members.pull(memberId);
    await meetup.save();
    
    return meetup;
};

// Sets or clears the confirmed station or venue; a new station clears the venue
exports.setFinalChoice = async function(code, kind, choice) {
    const update = kind === 'station'
        ? { finalStation : choice, finalVenue : null }
        : { finalVenue : choice };
    return await Meetup.findOneAndUpdate({ code : code }, update, { returnDocument : 'after' });
}
