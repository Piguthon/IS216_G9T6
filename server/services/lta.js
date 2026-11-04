/*
  FILE:            services/lta.js
  OWNER:           P4 (team-written)
  PURPOSE:         calls LTA DataMall Bus Arrival v3
                   (https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=)
                   with the AccountKey header from .env
  FUNCTIONS:       getBusArrival(stopCode) → LTA's answer; errors go to the caller
                   (controllers/bus-controller.js), which handles them in its try/catch
  REVISE:          Wk 5 Axios GET with headers config + try/catch
  SAMPLE RESPONSE: sample-data/lta-bus-arrival.json
*/

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
