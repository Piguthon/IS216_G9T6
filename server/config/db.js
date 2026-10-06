// config/db.js
// MongoDB Atlas connection through Mongoose (https://mongoosejs.com, MIT).
// A missing or unreachable database is logged but does not stop the server,
// so frontend work is not blocked. /api/health reports 503 until it connects.
// connectDB() always returns a promise that resolves (it never rejects),
// so server.js can call connectDB().then(startServer).

const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[db] MONGODB_URI is not set. Running without a database.');
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log('[db] connected to MongoDB');
  } catch (err) {
    console.error(`[db] connection failed: ${err.message}`);
  }
}

module.exports = connectDB;
