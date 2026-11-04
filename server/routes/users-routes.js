/*
  FILE:      routes/users-routes.js
  OWNER:     JX (team-written)
  PURPOSE:   Express router for /api/users (mounted in server.js)
  ENDPOINTS: POST   /api/users/signup                      create an account and log in
             POST   /api/users/login                       log in
             POST   /api/users/logout                      end this session
             GET    /api/users/me (also /profile)          my account
             PUT    /api/users/me                          rename my account
             PUT    /api/users/me/password                 change my password
             DELETE /api/users/me                          delete my account
             GET    /api/users/me/locations                my saved start locations
             POST   /api/users/me/locations                save a location
             PUT    /api/users/me/locations/:id            rename a saved location
             PUT    /api/users/me/locations/:id/default    make it my default start point
             DELETE /api/users/me/locations/:id            delete a saved location
             GET    /api/users/me/favourites               my favourite venues
             POST   /api/users/me/favourites               save a favourite venue
             DELETE /api/users/me/favourites/:venueKey     remove a favourite venue
             Everything except signup and login needs a login (middleware/auth.js)
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
  getFavourites,
  addFavourite,
  removeFavourite,
  updateProfile,
  changePassword,
  setDefaultLocation,
} = require('../controllers/users-controller');

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
const { requireAuth } = require('../middleware/auth');
router.get('/me', requireAuth, getProfile);
router.put('/me', requireAuth, updateProfile);
router.put('/me/password', requireAuth, changePassword);
router.put('/me/locations/:id/default', requireAuth, setDefaultLocation);
router.delete('/me', requireAuth, deleteAccount);
router.get('/profile', requireAuth, getProfile);
router.get('/me/locations', requireAuth, getLocations);
router.post('/me/locations', requireAuth, addLocation);
router.put('/me/locations/:id', requireAuth, renameLocation);
router.delete('/me/locations/:id', requireAuth, deleteLocation);
router.get('/me/favourites', requireAuth, getFavourites);
router.post('/me/favourites', requireAuth, addFavourite);
router.delete('/me/favourites/:venueKey', requireAuth, removeFavourite);

module.exports = router;
