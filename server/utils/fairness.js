/*
  FILE:      utils/fairness.js
  OWNER:     P3 (team-written)
  PURPOSE:   ranks candidates by the project's fairness rule (from the proposal): the shortest
             longest journey comes first; ties go to the lower total travel time
  FUNCTIONS: rankCandidates(candidates) → the same items, sorted, with longestMinutes and
             totalMinutes filled in.
             Kept pure (no database or API calls) so it's easy to check with sample data
  DATA:      Ranking [ { stationId, name, lat, lng, times: [ { memberId, name, minutes } ],
                         longestMinutes, totalMinutes } ]   (fairest first)
*/

// TODO (P3)
