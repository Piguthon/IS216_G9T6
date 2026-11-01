// Decodes an encoded polyline, the format OneMap uses for each part of a route, into a list of
// [lat, lng] points. Format: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded) {
  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  // Each number is stored as a run of characters, 5 bits at a time
  function nextNumber() {
    let result = 0
    let shift = 0
    let chunk
    do {
      chunk = encoded.charCodeAt(index++) - 63
      result |= (chunk & 31) << shift
      shift += 5
    } while (chunk >= 32)
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < encoded.length) {
    lat += nextNumber() // each point is stored as the change from the previous one
    lng += nextNumber()
    points.push([lat / 100000, lng / 100000])
  }
  return points
}
