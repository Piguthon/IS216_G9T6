/*
  FILE:      controllers/ranking-controller.js
  OWNER:     P3 (team-written)
  PURPOSE:   for a meetup, gets each member's public-transport travel time to each candidate
             meeting point and returns the candidates ranked fairest first
  FUNCTIONS: getRanking (:code → Ranking)
  DATA:      Ranking [ { stationId, name, lat, lng, times: [ { memberId, name, minutes } ],
                         longestMinutes, totalMinutes } ]   (fairest first)
  TALKS TO:  models/meetup-model.js, models/station-model.js, services/onemap.js, utils/fairness.js
  DONE WHEN:
    - [ ] works in Postman for a meetup with 2–3 members
    - [ ] keeps OneMap calls low (members × candidates)
    - [ ] a clear error when fewer than 2 members have a start
*/

// TODO (P3)
