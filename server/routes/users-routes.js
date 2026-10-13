/*
  FILE:      routes/users-routes.js
  OWNER:     P1 (after the pitch) (team-written)
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
  getProfile,
} = require('../controllers/users-controller');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', getProfile);

module.exports = router;
