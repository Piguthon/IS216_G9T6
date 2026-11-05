// Checks the Bearer session token on account routes.
const User = require('../models/user-model');

// The token from "Authorization: Bearer <token>", or '' if there isn't one
function readSessionToken(req) {
  const authorization = req.get('Authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}
exports.readSessionToken = readSessionToken;

exports.requireAuth = async (req, res, next) => {
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });

  try {
    const user = await User.findOne({ sessionToken: token });
    if (!user) {
      return res.status(401).json({ error: 'Your session is invalid. Please log in again.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication failed:', error.message);
    res.status(500).json({ error: 'Unable to check your session. Please try again.' });
  }
};

// Logs the user in if a token was sent, otherwise lets a guest through
exports.optionalAuth = (req, res, next) => {
  if (req.get('Authorization')) return exports.requireAuth(req, res, next);
  next();
};
