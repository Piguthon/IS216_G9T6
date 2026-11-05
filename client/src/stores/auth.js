// Shared login state for the navbar and account pages.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { BASE_URL } from '../config'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('fairspot-token') || '')
  const isLoggedIn = computed(() => token.value !== '')

  function clearSession() {
    localStorage.removeItem('fairspot-token')
    token.value = ''
  }

  function login(sessionToken) {
    localStorage.setItem('fairspot-token', sessionToken)
    token.value = sessionToken
  }

  async function logout() {
    if (token.value) {
      await axios.post(
        `${BASE_URL}/users/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token.value}` },
          timeout: 10000,
        },
      )
    }
    clearSession()
  }

  return { token, isLoggedIn, login, logout, clearSession }
})
