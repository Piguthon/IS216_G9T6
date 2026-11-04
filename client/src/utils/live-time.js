// Times for the live map. updatedAt values are ISO strings from the server; now is milliseconds.

// A dot that hasn't moved for 2 minutes is probably a phone that went to sleep.
export const STALE_AFTER_MS = 2 * 60 * 1000

// timeAgo(iso, now): how long ago, in words: "just now", "40s ago", "3 min ago"
export function timeAgo(iso, now) {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)} min ago`
}

// isStale(iso, now): true when the location is older than STALE_AFTER_MS
export function isStale(iso, now) {
  return now - new Date(iso).getTime() > STALE_AFTER_MS
}

// byTripTime(a, b): for sort(), soonest trip first; people without a route (etaMinutes null)
// go last
export function byTripTime(a, b) {
  if (a.etaMinutes === b.etaMinutes) return 0
  if (a.etaMinutes === null) return 1
  if (b.etaMinutes === null) return -1
  return a.etaMinutes - b.etaMinutes
}
