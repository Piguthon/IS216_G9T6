// Calls LTA DataMall Bus Arrival v3 with the AccountKey header from .env.
// Sample response: sample-data/lta-bus-arrival.json

const axios = require('axios');
async function getBusArrival(stopCode) {
  const response = await axios.get(
    'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival',
    {
      params: {
        BusStopCode: stopCode,
      },
      headers: {
        AccountKey: process.env.LTA_ACCOUNT_KEY,
      },
      timeout: 15000,
    },
  );

  return response.data;
}
module.exports = { getBusArrival };
