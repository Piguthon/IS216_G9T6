// Traffic-light colours for travel times: red is the longest trip, green the shortest,
// amber everything else. When every trip is the same length, they are all green.
export function tripTone(minutes, longest, shortest) {
  if (minutes === shortest) return 'is-green'
  if (minutes === longest) return 'is-red'
  return 'is-amber'
}
