/*
  FILE:      utils/route-privacy.js
  OWNER:     JS (team-written, with the meetups flow)
  PURPOSE:   The ranking GETs are public, but each trip's steps[].points are map lines that
             start at the member's start point, and firstBusStopCode is the stop next to it.
             Anyone who only knows the code gets the trips without them, so they can't work
             out where members live. Members get everything.
  EXPORTS:   withoutRoute(trip) → a copy of the trip without steps and firstBusStopCode
             (name, travelMode, minutes, waitMinutes, leaveAt and arriveAt stay)
             rankingWithoutRoutes(ranking) → a copy of the ranking with every times[] trip
             stripped as above
             tripsWithoutRoutes(trips) → a copy of the leave-times trips, stripped as above
             None of them change what they are given (it is the saved or cached copy).
  USED BY:   controllers/ranking-controller.js
*/

function withoutRoute(trip) {
  const shown = { ...trip };
  delete shown.steps;
  delete shown.firstBusStopCode;
  return shown;
}

function rankingWithoutRoutes(ranking) {
  return ranking.map((candidate) => ({
    ...candidate,
    times: candidate.times.map(withoutRoute),
  }));
}

function tripsWithoutRoutes(trips) {
  return trips.map(withoutRoute);
}

module.exports = { withoutRoute, rankingWithoutRoutes, tripsWithoutRoutes };
