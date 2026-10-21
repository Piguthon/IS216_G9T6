// OWNER: JX. Week 11 setup store: shared login state for the navbar and account pages.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { BASE_URL } from '../config'

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const isLoggedIn = computed(() => token.value !== '')

  function clearSession() {
    localStorage.removeItem('fairspot-token')
    localStorage.removeItem('fairspot-expires-at')
    sessionStorage.removeItem('fairspot-token')
    sessionStorage.removeItem('fairspot-expires-at')
    token.value = ''
  }

  function login(sessionToken, remember = false, expiresAt) {
    clearSession()
    const storage = remember ? localStorage : sessionStorage
    storage.setItem('fairspot-token', sessionToken)
    storage.setItem('fairspot-expires-at', expiresAt)
    token.value = sessionToken
  }

  async function logout() {
    if (token.value) {
      await axios.post(`${BASE_URL}/users/logout`, {}, {
        headers: { Authorization: `Bearer ${token.value}` },
        timeout: 10000,
      })
    }
    clearSession()
  }

  const savedToken = sessionStorage.getItem('fairspot-token') || localStorage.getItem('fairspot-token')
  const savedExpiry = sessionStorage.getItem('fairspot-expires-at') || localStorage.getItem('fairspot-expires-at')
  if (savedToken && new Date(savedExpiry).getTime() > Date.now()) {
    token.value = savedToken
  } else {
    clearSession()
  }

  return { token, isLoggedIn, login, logout, clearSession }
})
