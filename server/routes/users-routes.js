/*
  FILE:      routes/users-routes.js
  OWNER:     JX (team-written)
  PURPOSE:   Express router for /api/users (mounted in server.js)
  ENDPOINTS: POST /api/users/signup
             POST /api/users/login
             user profile, saved locations, history and favourites endpoints (to be defined)
  TALKS TO:  controllers/users-controller.js
*/

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
} = require('../controllers/users-controller');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
const { requireAuth } = require('../middleware/auth');
router.get('/me', requireAuth, getProfile);
router.delete('/me', requireAuth, deleteAccount);
router.get('/profile', requireAuth, getProfile);
router.get('/me/locations', requireAuth, getLocations);
router.post('/me/locations', requireAuth, addLocation);
router.put('/me/locations/:id', requireAuth, renameLocation);
router.delete('/me/locations/:id', requireAuth, deleteLocation);

module.exports = router;
