// Works out which member of a meetup is making the request, from their login or guest secret.
const Meetup = require('../models/meetup-model');
const User = require('../models/user-model');
const { readSessionToken } = require('./auth');

// The calling member, or null; throws 'Invalid session' for an unknown session without a guest secret
async function findCaller(req, meetup) {
  const sessionToken = readSessionToken(req);
  const memberToken = req.get('X-Member-Token') || '';
  if (sessionToken) {
    const user = await User.findOne({ sessionToken: sessionToken });
    if (user) {
      req.user = user;
      const mine = meetup.members.find((member) => member.userId === String(user._id));
      if (mine) return mine;
    } else if (!memberToken) {
      throw new Error('Invalid session');
    }
  }

  if (!memberToken) return null;
  return meetup.members.find((member) => member.memberToken === memberToken) || null;
}
exports.findCaller = findCaller;

// Route middleware: sets req.meetup and req.member, or replies 404, 401 or 403
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
