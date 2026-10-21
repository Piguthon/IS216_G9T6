// OWNER: JX. Authenticate account routes using the team's Bearer session token.
const User = require('../models/user-model');

exports.requireAuth = async (req, res, next) => {
  const authorization = req.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
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
