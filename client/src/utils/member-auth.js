// The axios config that tells the server which member I am: my login and/or my guest secret
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
