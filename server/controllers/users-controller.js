/*
  FILE:      controllers/users-controller.js
  OWNER:     JX (team-written)
  PURPOSE:   sign-up, login and account endpoints (decision D5: bcrypt password hashes, a session
             token stored in MongoDB and sent by the client in the Authorization header)
  FUNCTIONS: signup, login, profile and saved-location CRUD
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

  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
    return res.status(400).json({ error: 'Use at least 8 characters with an uppercase letter, lowercase letter, digit and symbol.' });
  }

  try {
  const passwordHash = await bcrypt.hash(password, 12);
  const token = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    sessionToken: token,
    sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return res.status(201).json({
    token,
    expiresAt: user.sessionExpiresAt,
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
  const sessionDays = req.body.rememberMe === true ? 7 : 1;
  user.sessionExpiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await user.save();

  return res.status(200).json({
    token,
    expiresAt: user.sessionExpiresAt,
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

function getProfile(req, res) {
  res.json({ user: { _id: req.user._id, name: req.user.name, email: req.user.email } });
}

function getLocations(req, res) {
  res.json(req.user.savedLocations);
}

async function addLocation(req, res) {
  const { label, address, postal, lat, lng } = req.body;
  if (typeof label !== 'string' || !label.trim() || label.trim().length > 60 ||
      typeof address !== 'string' || !address.trim() || address.trim().length > 300 ||
      typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180 ||
      typeof postal !== 'string' || (postal !== '' && !/^\d{6}$/.test(postal))) {
    return res.status(400).json({ error: 'Enter a nickname (up to 60 characters) and select a valid address.' });
  }
  try {
    req.user.savedLocations.push({ label: label.trim(), address: address.trim(), postal, lat, lng });
    await req.user.save();
    res.status(201).json(req.user.savedLocations);
  } catch (error) {
    console.error('Saving location failed:', error.message);
    res.status(500).json({ error: 'Unable to save your location. Please try again.' });
  }
}

async function renameLocation(req, res) {
  const { label } = req.body;
  if (typeof label !== 'string' || !label.trim() || label.trim().length > 60) {
    return res.status(400).json({ error: 'Enter a nickname between 1 and 60 characters.' });
  }
  const location = req.user.savedLocations.find(item => String(item._id) === req.params.id);
  if (!location) return res.status(404).json({ error: 'Saved location not found.' });
  try {
    location.label = label.trim();
    await req.user.save();
    res.json(req.user.savedLocations);
  } catch (error) {
    console.error('Renaming location failed:', error.message);
    res.status(500).json({ error: 'Unable to rename your location. Please try again.' });
  }
}

async function deleteLocation(req, res) {
  const index = req.user.savedLocations.findIndex(item => String(item._id) === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Saved location not found.' });
  try {
    req.user.savedLocations.splice(index, 1);
    await req.user.save();
    res.json(req.user.savedLocations);
  } catch (error) {
    console.error('Deleting location failed:', error.message);
    res.status(500).json({ error: 'Unable to delete your location. Please try again.' });
  }
}

async function deleteAccount(req, res) {
  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Enter your current password to delete your account.' });
  }
  try {
    const user = await User.findOne({ _id: req.user._id }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(403).json({ error: 'Incorrect password. Your account has not been deleted.' });
    }
    await User.deleteOne({ _id: req.user._id });
    res.json({ message: 'Your account and saved locations have been deleted.' });
  } catch (error) {
    console.error('Account deletion failed:', error.message);
    res.status(500).json({ error: 'Unable to delete your account. Please try again.' });
  }
}

async function logout(req, res) {
  const authorization = req.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return res.status(400).json({ error: 'A session token is required.' });
  try {
    // Match the submitted token so an old logout cannot revoke a newer login.
    await User.updateOne({ sessionToken: token }, {
      $unset: { sessionToken: '', sessionExpiresAt: '' },
    });
    res.json({ message: 'Logged out.' });
  } catch (error) {
    console.error('Logout failed:', error.message);
    res.status(500).json({ error: 'Unable to log out. Please try again.' });
  }
}

module.exports = { signup, login, logout, getProfile, getLocations, addLocation, renameLocation, deleteLocation, deleteAccount };
