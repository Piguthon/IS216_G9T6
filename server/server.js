// server.js
// Entry point of the FairSpot API: an Express app in the course MVC layout
// (routes -> controllers -> models, plus services for external APIs).
// In production it also serves the built Vue app, so the whole app is one Render service.
//
// Libraries used (all free / open source):
//   Express (https://expressjs.com, MIT)
//   cors (https://github.com/expressjs/cors, MIT)
//   Mongoose (https://mongoosejs.com, MIT)
//   dotenv (https://github.com/motdotla/dotenv, BSD-2-Clause)
//   nodemon (https://nodemon.io, MIT): development only, restarts the server when a file changes

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const connectDB = require('./config/db');

const healthRoutes = require('./routes/health-routes');
const meetupsRoutes = require('./routes/meetups-routes');
const rankingRoutes = require('./routes/ranking-routes');
const venuesRoutes = require('./routes/venues-routes');
const busRoutes = require('./routes/bus-routes');
const usersRoutes = require('./routes/users-routes');
const reviewsRoutes = require('./routes/reviews-routes');
const votesRoutes = require('./routes/votes-routes');
const liveRoutes = require('./routes/live-routes');

const PORT = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.use(cors());
app.use(express.json());

// ---------- API routes (all under /api) ----------
app.use('/api/health', healthRoutes);
app.use('/api/meetups', meetupsRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/bus-arrival', busRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/votes', votesRoutes);
app.use('/api/live', liveRoutes);

// Any other /api path: answer with JSON instead of an HTML error page
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- Built Vue app (production only) ----------
if (isProduction) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (!fs.existsSync(clientDist)) {
    console.warn('[server] client/dist not found. Run "pnpm build" in client/ first.');
  }
  app.use(express.static(clientDist));
  // Let Vue Router handle every other GET (history mode)
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ---------- Start ----------
function startServer() {
  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

connectDB().then(startServer);
