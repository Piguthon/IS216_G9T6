// Sign-up, login and account endpoints (bcrypt password hashes and a session token).

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
  const { address, postal, lat, lng } = req.body;
  const changingAddress = address !== undefined || postal !== undefined || lat !== undefined || lng !== undefined;
  if (changingAddress && (typeof address !== 'string' || !address.trim() || address.length > 300 ||
      typeof postal !== 'string' || (postal !== '' && !/^\d{6}$/.test(postal)) ||
      typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180)) {
    return res.status(400).json({ error: 'Select a valid replacement address.' });
  }
  try {
    location.label = label.trim();
    if (changingAddress) {
      location.address = address.trim();
      location.postal = postal;
      location.lat = lat;
      location.lng = lng;
    }
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
      return res.status(403).json({ error: 'Incorrect password.' });
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
    await User.updateOne({ sessionToken: token }, {
      sessionToken: '',
    });
    res.json({ message: 'Logged out.' });
  } catch (error) {
    console.error('Logout failed:', error.message);
    res.status(500).json({ error: 'Unable to log out. Please try again.' });
  }
}

function getFavourites(req, res) {
  res.json(req.user.favourites);
}

async function addFavourite(req, res) {
  const { venueKey, name, address = '', lat, lng } = req.body || {};
  if (typeof venueKey !== 'string' || !venueKey.trim() || venueKey.length > 300 ||
      typeof name !== 'string' || !name.trim() || name.length > 200 ||
      typeof address !== 'string' || address.length > 500 ||
      typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Valid venue details are required.' });
  }
  try {
    const key = venueKey.trim();
    if (!req.user.favourites.some(venue => venue.venueKey === key)) {
      req.user.favourites.push({ venueKey: key, name: name.trim(), address: address.trim(), lat, lng });
      await req.user.save();
    }
    res.json({ message: 'Venue saved to favourites.' });
  } catch (error) {
    console.error('Saving favourite failed:', error.message);
    res.status(500).json({ error: 'Unable to save this venue. Please try again.' });
  }
}

async function removeFavourite(req, res) {
  const index = req.user.favourites.findIndex(venue => venue.venueKey === req.params.venueKey);
  if (index === -1) return res.status(404).json({ error: 'Favourite venue not found.' });
  try {
    req.user.favourites.splice(index, 1);
    await req.user.save();
    res.json(req.user.favourites);
  } catch (error) {
    console.error('Removing favourite failed:', error.message);
    res.status(500).json({ error: 'Unable to remove this venue. Please try again.' });
  }
}

async function updateProfile(req, res) {
  const { name } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ error: 'Enter a name between 1 and 100 characters.' });
  }
  try {
    await User.updateOne({ _id: req.user._id }, { name: name.trim() });
    res.json({ user: { _id: req.user._id, name: name.trim(), email: req.user.email } });
  } catch (error) {
    console.error('Updating profile failed:', error.message);
    res.status(500).json({ error: 'Unable to update your name. Please try again.' });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' ||
      newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9\s]/.test(newPassword)) {
    return res.status(400).json({ error: 'Enter your current password and a new password with at least 8 characters, uppercase, lowercase, a digit and a symbol.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'Choose a different new password.' });
  }
  try {
    const user = await User.findOne({ _id: req.user._id }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(403).json({ error: 'Your current password is incorrect.' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: req.user._id }, { passwordHash, sessionToken: '' });
    res.json({ message: 'Password changed. Please log in again.' });
  } catch (error) {
    console.error('Changing password failed:', error.message);
    res.status(500).json({ error: 'Unable to change your password. Please try again.' });
  }
}

async function setDefaultLocation(req, res) {
  const selected = req.user.savedLocations.find(location => String(location._id) === req.params.id);
  if (!selected) return res.status(404).json({ error: 'Saved location not found.' });
  try {
    for (const location of req.user.savedLocations) {
      location.isDefault = String(location._id) === req.params.id;
    }
    await req.user.save();
    res.json(req.user.savedLocations);
  } catch (error) {
    console.error('Setting default location failed:', error.message);
    res.status(500).json({ error: 'Unable to set your default location. Please try again.' });
  }
}

module.exports = { signup, login, logout, getProfile, getLocations, addLocation, renameLocation, deleteLocation, deleteAccount, getFavourites, addFavourite, removeFavourite, updateProfile, changePassword, setDefaultLocation };
