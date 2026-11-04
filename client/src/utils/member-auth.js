// Tells the server which member "I" am in a meetup, as an axios config (Week 5: headers via
// config). The server never trusts a member id from the page; it works out who you are from:
//   - Authorization: Bearer <session>, when you're logged in
//   - X-Member-Token: the secret this browser got back when it created or joined the meetup,
//     saved in localStorage as fairspot-member-token-<code> (guests need this one)
// Both are sent when both are there, so a guest who logs in later is still recognised.
// Used by the lobby, results and summary pages (server/middleware/member.js checks them).
export function memberAuthConfig(code, sessionToken) {
  const headers = {}
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`
  }
  const memberToken = localStorage.getItem(`fairspot-member-token-${code}`)
  if (memberToken) {
    headers['X-Member-Token'] = memberToken
  }
  return { headers }
}
