// Express router for /api/users.

const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  logout,
  getProfile,
  getLocations,
  addLocation,
  renameLocation,
  deleteLocation,
  deleteAccount,
  getFavourites,
  addFavourite,
  removeFavourite,
  updateProfile,
  changePassword,
  setDefaultLocation,
} = require('../controllers/users-controller');
const { requireAuth } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, getProfile);
router.put('/me', requireAuth, updateProfile);
router.put('/me/password', requireAuth, changePassword);
router.put('/me/locations/:id/default', requireAuth, setDefaultLocation);
router.delete('/me', requireAuth, deleteAccount);
router.get('/me/locations', requireAuth, getLocations);
router.post('/me/locations', requireAuth, addLocation);
router.put('/me/locations/:id', requireAuth, renameLocation);
router.delete('/me/locations/:id', requireAuth, deleteLocation);
router.get('/me/favourites', requireAuth, getFavourites);
router.post('/me/favourites', requireAuth, addFavourite);
router.delete('/me/favourites/:venueKey', requireAuth, removeFavourite);

module.exports = router;
