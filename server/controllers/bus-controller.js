// Returns live next-bus times for a bus stop, in our own simple shape.

const lta = require('../services/lta');
async function getBusArrival(req, res) {
  const { stopCode } = req.params;

  if (!/^\d{5}$/.test(stopCode)) {
    return res.status(400).json({
      error: 'Bus stop code must contain exactly 5 digits.',
    });
  }

  try {
    const data = await lta.getBusArrival(stopCode);

    const services = [];

    for (const service of data.Services || []) {
      const nextArrivals = [];

      for (const bus of [service.NextBus, service.NextBus2, service.NextBus3]) {
        if (bus && bus.EstimatedArrival) {
          nextArrivals.push(bus.EstimatedArrival);
        }
      }

      services.push({
        serviceNo: service.ServiceNo,
        nextArrivals,
      });
    }

    return res.json({
      stopCode,
      services,
    });
  } catch (error) {
    console.error('Bus arrival lookup failed:', error.message);

    return res.status(502).json({
      error: 'Unable to retrieve bus arrivals. Please try again.',
    });
  }
}
module.exports = { getBusArrival };
