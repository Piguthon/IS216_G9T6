/*
  FILE:      utils/fairness.js
  OWNER:     P3 (team-written)
  PURPOSE:   ranks candidates by the project's fairness rule (from the proposal): the shortest
             longest journey comes first; ties go to the lower total travel time
  FUNCTIONS: rankCandidates(candidates) → the same items, sorted, with longestMinutes and
             totalMinutes filled in.
             findMidpoint(points) → { lat, lng }, the average of the group's start points
             pickCandidates(stations, midpoint, perType) → the stations of each type
             (mrt, interchange) closest to the midpoint, nearest first
             Kept pure (no database or API calls) so it's easy to check with sample data
  DATA:      Ranking [ { stationId, name, type, lat, lng, times: [ { memberId, name, minutes } ],
                         longestMinutes, totalMinutes } ]   (fairest first)
*/

// Straight-line distance in km (haversine formula); good enough to find "near the middle"
function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function findMidpoint(points) {
  let lat = 0;
  let lng = 0;
  for (const point of points) {
    lat += point.lat;
    lng += point.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

// perType: how many of each type to keep, e.g. { mrt: 3, interchange: 2 }
function pickCandidates(stations, midpoint, perType) {
  const picked = [];
  for (const type of Object.keys(perType)) {
    const ofType = stations
      .filter((station) => station.type === type)
      .map((station) => ({ station, km: distanceKm(midpoint, station) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, perType[type]);
    for (const item of ofType) picked.push(item);
  }
  picked.sort((a, b) => a.km - b.km);
  return picked.map((item) => item.station);
}

function rankCandidates(candidates) {
  const ranked = candidates.map((candidate) => {
    let longestMinutes = 0;
    let totalMinutes = 0;
    for (const t of candidate.times) {
      if (t.minutes > longestMinutes) longestMinutes = t.minutes;
      totalMinutes += t.minutes;
    }
    return { ...candidate, longestMinutes, totalMinutes };
  });
  ranked.sort((a, b) => a.longestMinutes - b.longestMinutes || a.totalMinutes - b.totalMinutes);
  return ranked;
}

module.exports = { distanceKm, findMidpoint, pickCandidates, rankCandidates };
