// The fairness rule: the shortest longest journey comes first; ties go to the lower total travel time.

// Straight-line distance in km to find "near the middle"
function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// The average of the group's start points
function findMidpoint(points) {
  let lat = 0;
  let lng = 0;
  for (const point of points) {
    lat += point.lat;
    lng += point.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

// The nearest stations of each type to the midpoint, e.g. perType { mrt: 30 }, maxKmByType { interchange: 3 }
function pickCandidates(stations, midpoint, perType, maxKmByType = {}) {
  const picked = [];
  for (const type of Object.keys(perType)) {
    const maxKm = maxKmByType[type] ?? Infinity;
    const ofType = stations
      .filter((station) => station.type === type)
      .map((station) => ({ station, km: distanceKm(midpoint, station) }))
      .filter((item) => item.km <= maxKm)
      .sort((a, b) => a.km - b.km)
      .slice(0, perType[type]);
    for (const item of ofType) picked.push(item);
  }
  picked.sort((a, b) => a.km - b.km);
  return picked.map((item) => item.station);
}

// The candidates sorted by the fairness rule, with longestMinutes and totalMinutes filled in
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
