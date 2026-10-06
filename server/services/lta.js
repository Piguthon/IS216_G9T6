/*
  FILE:            services/lta.js
  OWNER:           P4 (team-written)
  PURPOSE:         calls LTA DataMall Bus Arrival v3
                   (https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=)
                   with the AccountKey header from .env
  FUNCTIONS:       getBusArrival(stopCode),
                   plus later getBusStops(skip) for P3's interchange seed (500 per page)
  REVISE:          Wk 5 Axios GET with headers config + try/catch
  SAMPLE RESPONSE: fixtures/lta-bus-arrival.json
*/

// TODO (P4)
