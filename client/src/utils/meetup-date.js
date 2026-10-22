// Singapore is UTC+8. Return YYYY-MM-DD for the HTML date input.
export function todayInSingapore() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
