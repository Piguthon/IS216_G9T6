// Singapore is UTC+8. Return YYYY-MM-DD for the HTML date input.
export function todayInSingapore() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Show a stored YYYY-MM-DD date as DD-MM-YYYY. The stored value stays YYYY-MM-DD.
export function formatDate(date) {
  const parts = date.split('-')
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

// Show a 24-hour HH:MM time as 12-hour, e.g. 14:05 becomes 2:05pm
export function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const suffix = hours < 12 ? 'am' : 'pm'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')}${suffix}`
}
