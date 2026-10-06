/*
  FILE:      controllers/bus-controller.js
  OWNER:     P4 (team-written)
  PURPOSE:   returns live next-bus times for a bus stop, in our own simple shape
  FUNCTIONS: getBusArrival (:stopCode → Bus)
  DATA:      Bus { stopCode, services: [ { serviceNo, nextArrivals: [ ISO time strings ] } ] }
  TALKS TO:  services/lta.js
  DONE WHEN:
    - [ ] works in Postman
    - [ ] 400 for a non-5-digit code
    - [ ] an empty services list (not an error) when buses aren't running
*/

// TODO (P4)
