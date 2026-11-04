/*
  FILE:     middleware/member.js
  OWNER:    reference flow, team-written (meetups, with middleware/auth.js from JX)
  PURPOSE:  works out which member of a meetup is making the request, on the server. Member ids
            are public (GET /api/meetups/:code), so the client can't just say which member it is.
              - logged in: "Authorization: Bearer <session>" → the member with that account
              - guest: "X-Member-Token: <memberToken>" → the member with that secret (they got
                it in the reply when they joined)
  FUNCTIONS: findCaller(req, meetup) → the member, or null; throws 'Invalid session' when the
                                       session is unknown and there is no X-Member-Token (an
                                       unknown session with a token is ignored). getMeetup and
                                       the ranking GETs use it without failing
             requireMember (route middleware) → sets req.meetup and req.member, or replies
                                       404 unknown code · 401 invalid session · 403 not a member
  REVISE:   Week 11 server/products/server.js (requireAuth middleware)
*/
const Meetup = require('../models/meetup-model');
const User = require('../models/user-model');
const { readSessionToken } = require('./auth');

async function findCaller(req, meetup) {
  const sessionToken = readSessionToken(req);
  const memberToken = req.get('X-Member-Token') || '';
  if (sessionToken) {
    const user = await User.findOne({ sessionToken: sessionToken });
    if (user) {
      req.user = user;
      const mine = meetup.members.find((member) => member.userId === String(user._id));
      if (mine) return mine;
      // Not with this account: they may have joined as a guest before logging in, so the
      // guest secret below still counts
    } else if (!memberToken) {
      throw new Error('Invalid session');
    }
    // An unknown session with a guest secret: logging in elsewhere replaces the session, so
    // this browser's old one is ignored and the secret decides
  }

  if (!memberToken) return null;
  return meetup.members.find((member) => member.memberToken === memberToken) || null;
}
exports.findCaller = findCaller;

exports.requireMember = async (req, res, next) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) return res.status(404).json({ error: 'Unknown code' });

    let member;
    try {
      member = await findCaller(req, meetup);
    } catch (error) {
      if (error.message === 'Invalid session') {
        return res.status(401).json({ error: 'Your session is invalid. Please log in again.' });
      }
      throw error;
    }
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this meetup.' });
    }

    req.meetup = meetup;
    req.member = member;
    next();
  } catch (error) {
    console.error('Member check failed:', error.message);
    res.status(500).json({ error: 'Unable to check who you are in this meetup. Please try again.' });
  }
};
