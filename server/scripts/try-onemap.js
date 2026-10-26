require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { getPtRoute, tokenStatus } = require('../services/onemap');

async function main() {
  await connectDB();
  console.log('token:', await tokenStatus());
  // Jurong East MRT → Bishan MRT
  const result = await getPtRoute(
    { lat: 1.3332, lng: 103.7422 },
    { lat: 1.3510, lng: 103.8485 },
    '2026-11-06', '18:00'
  );
  console.log('route:', result);
  await mongoose.disconnect();
}
main();