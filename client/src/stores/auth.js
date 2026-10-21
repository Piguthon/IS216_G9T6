// OWNER: JX. Week 11 setup store: shared login state for the navbar and account pages.
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('fairspot-token') || '')
  const isLoggedIn = computed(() => token.value !== '')

  function login(sessionToken) {
    localStorage.setItem('fairspot-token', sessionToken)
    token.value = sessionToken
  }

  function logout() {
    localStorage.removeItem('fairspot-token')
    token.value = ''
  }

  return { token, isLoggedIn, login, logout }
})
