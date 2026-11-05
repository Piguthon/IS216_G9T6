// Reports whether the server can reach OneMap, for an uptime monitor to ping.

const { tokenStatus } = require('../services/onemap');

exports.getHealth = async (req, res) => {
  const onemapStatus = await tokenStatus();
  res.status(onemapStatus.ok ? 200 : 503).json({ onemap: onemapStatus });
};
