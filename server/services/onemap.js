// FILE:      services/onemap.js
// OWNER:     P3 (lead) with P1 (team-written)
// PURPOSE:   OneMap client with automatic token management for FairSpot.
// STATUS:    Working draft that is OUT OF SYLLABUS. It uses axios.create and interceptors.
//            The team rewrites it into plain exported functions using axios.get/axios.post
//            + try/catch (course Week 5 pattern), keeping the same behaviour:
//              - token saved in MongoDB
//              - refresh when under 12 hours remain
//              - retry once on 401
// MUST KEEP: exporting tokenStatus() (used by routes/health-routes.js)
// WILL EXPORT (planned): getToken, searchAddress, getPtRoute
// REVISE:    Wk 5 Axios GET/POST, headers config, async/await, try/catch
//
// What this handles:
//   1. Gets a token using the team's OneMap account (credentials in env vars, never committed)
//   2. Stores the token in MongoDB so a restart (e.g. Render waking from sleep) reuses it
//      instead of calling getToken again
//   3. Refreshes proactively when less than 12 hours remain
//   4. Refreshes reactively on a 401 and retries the request once
//   5. Single-flight refresh: if 50 routing calls hit an expired token at once,
//      they share ONE getToken call instead of making 50
//   6. Backs off and retries on 429 (rate limited)
//
// Required env vars: ONEMAP_EMAIL, ONEMAP_PASSWORD
// Requires an open mongoose connection before the first call.

const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'https://www.onemap.gov.sg';
const REFRESH_MARGIN_MS = 12 * 60 * 60 * 1000; // refresh when < 12h of validity left

// ---------- Token persistence ----------
const tokenSchema = new mongoose.Schema({
  _id: { type: String, default: 'onemap' },
  accessToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
const ApiToken = mongoose.models.ApiToken || mongoose.model('ApiToken', tokenSchema);

let cached = null;         // { accessToken, expiresAt } held in memory
let refreshPromise = null; // shared in-flight refresh (single-flight)

function isFresh(t) {
  return Boolean(t) && new Date(t.expiresAt).getTime() - Date.now() > REFRESH_MARGIN_MS;
}

async function requestNewToken() {
  const { data } = await axios.post(
    `${BASE_URL}/api/auth/post/getToken`,
    { email: process.env.ONEMAP_EMAIL, password: process.env.ONEMAP_PASSWORD },
    { timeout: 10000 }
  );
  const token = {
    accessToken: data.access_token,
    expiresAt: new Date(Number(data.expiry_timestamp) * 1000), // expiry is in seconds
  };
  await ApiToken.findByIdAndUpdate('onemap', token, { upsert: true });
  return token;
}

/**
 * Returns a valid access token.
 * @param {object} [opts]
 * @param {string} [opts.rejected] - a token OneMap just rejected with 401.
 *   If another request has already replaced it, we reuse the new one instead of refreshing again.
 */
async function getToken({ rejected } = {}) {
  if (rejected && cached && cached.accessToken !== rejected) return cached.accessToken;

  if (!rejected) {
    if (isFresh(cached)) return cached.accessToken;

    // After a restart, memory is empty: try the token saved in MongoDB first
    if (!cached) {
      const stored = await ApiToken.findById('onemap').lean();
      if (isFresh(stored)) {
        cached = stored;
        return cached.accessToken;
      }
    }
  }

  if (!refreshPromise) {
    refreshPromise = requestNewToken()
      .then((t) => { cached = t; return t; })
      .finally(() => { refreshPromise = null; });
  }
  return (await refreshPromise).accessToken;
}

// ---------- Axios instance used for ALL OneMap calls ----------
const onemap = axios.create({ baseURL: BASE_URL, timeout: 15000 });

onemap.interceptors.request.use(async (config) => {
  const token = await getToken();
  // OneMap's docs example sends the raw token. If you get a 400 asking for a
  // bearer token, change this to `Bearer ${token}`.
  config.headers.Authorization = token;
  config._token = token;
  return config;
});

onemap.interceptors.response.use(null, async (error) => {
  const { config, response } = error;
  if (!config) throw error;

  // Expired or invalid token: refresh once, then retry
  if (response?.status === 401 && !config._retried401) {
    config._retried401 = true;
    await getToken({ rejected: config._token });
    return onemap(config); // request interceptor attaches the new token
  }

  // Rate limited: wait 2s, then 4s, then give up
  const attempts = config._retries429 || 0;
  if (response?.status === 429 && attempts < 2) {
    config._retries429 = attempts + 1;
    await new Promise((r) => setTimeout(r, 1000 * 2 ** config._retries429));
    return onemap(config);
  }

  throw error;
});

// ---------- Health check (never exposes the token itself) ----------
async function tokenStatus() {
  try {
    await getToken();
    return { ok: true, expiresAt: cached.expiresAt };
  } catch (err) {
    return { ok: false, error: err.response?.status || err.message };
  }
}

module.exports = { onemap, getToken, tokenStatus };

/* ---------- Usage examples ----------

// Public transport route (date format is MM-DD-YYYY)
const { onemap } = require('./services/onemap');
const { data } = await onemap.get('/api/public/routingsvc/route', {
  params: {
    start: `${from.lat},${from.lng}`,
    end: `${to.lat},${to.lng}`,
    routeType: 'pt',
    mode: 'TRANSIT',
    date: '11-06-2026',
    time: '18:00:00',
    maxWalkDistance: 1000,
    numItineraries: 3,
  },
});

// Health endpoint in server.js, for an uptime monitor to ping
const { tokenStatus } = require('./services/onemap');
app.get('/api/health', async (req, res) => {
  const onemapStatus = await tokenStatus();
  res.status(onemapStatus.ok ? 200 : 503).json({ onemap: onemapStatus });
});
*/
