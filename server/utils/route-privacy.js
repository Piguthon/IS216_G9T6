// Strips routes from ranking trips for anyone who isn't a member, since routes start at members' homes.

// A copy of the trip without steps and firstBusStopCode
function withoutRoute(trip) {
  const shown = { ...trip };
  delete shown.steps;
  delete shown.firstBusStopCode;
  return shown;
}

// A copy of the ranking with every trip stripped as above
function rankingWithoutRoutes(ranking) {
  return ranking.map((candidate) => ({
    ...candidate,
    times: candidate.times.map(withoutRoute),
  }));
}

// A copy of the leave-times trips, stripped as above
function tripsWithoutRoutes(trips) {
  return trips.map(withoutRoute);
}

module.exports = { withoutRoute, rankingWithoutRoutes, tripsWithoutRoutes };
