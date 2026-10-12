/*
  FILE:      controllers/users-controller.js
  OWNER:     P1 (after the pitch) (team-written)
  PURPOSE:   sign-up, login and account endpoints (decision D5: bcrypt password hashes, a session
             token stored in MongoDB and sent by the client in the Authorization header)
  FUNCTIONS: to be defined by P1
  REVISE:    Wk 5 request headers (req.header('Authorization'))
*/

const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const User = require('../models/user-model');

async function signup(req, res) {
  const { name, email, password } = req.body;

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      error: 'Name, email, and password are required.',
    });
  }

  try {
  const passwordHash = await bcrypt.hash(password, 12);
  const token = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    sessionToken: token,
  });

  return res.status(201).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
} catch (error) {
  if (error.code === 11000) {
    return res.status(409).json({
      error: 'An account with this email already exists.',
    });
  }

  console.error('Signup failed:', error.message);

  return res.status(500).json({
    error: 'Unable to create your account. Please try again.',
  });
}
}

async function login(req, res) {
  const { email, password } = req.body;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      error: 'Email and password are required.',
    });
  }

  try {
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select('+passwordHash');

  const passwordMatches =
    user && (await bcrypt.compare(password, user.passwordHash));

  if (!passwordMatches) {
    return res.status(401).json({
      error: 'Invalid email or password.',
    });
  }

  const token = crypto.randomBytes(32).toString('hex');

  user.sessionToken = token;
  await user.save();

  return res.status(200).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
    },
  });
} catch (error) {
  console.error('Login failed:', error.message);

  return res.status(500).json({
    error: 'Unable to log in. Please try again.',
  });
}
}

async function getProfile(req, res) {
  const authorization = req.get('Authorization') || '';

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Please log in to view your profile.',
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Please log in to view your profile.',
    });
  }

  try {
    const user = await User.findOne({ sessionToken: token })
      .select('name email');

    if (!user) {
      return res.status(401).json({
        error: 'Your session is invalid. Please log in again.',
      });
    }

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Profile lookup failed:', error.message);

    return res.status(500).json({
      error: 'Unable to load your profile. Please try again.',
    });
  }
}
module.exports = { signup, login, getProfile };