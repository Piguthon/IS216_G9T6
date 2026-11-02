// OWNER: JX. Week 11 setup store: which venues this account has saved, shared by every venue
// card so a page of cards makes one request instead of one each.
import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useAuthStore } from './auth'

export const useFavouritesStore = defineStore('favourites', () => {
  const auth = useAuthStore()
  const venueKeys = ref([])

  function authConfig() {
    return { headers: { Authorization: `Bearer ${auth.token}` } }
  }

  function isSaved(venueKey) {
    return venueKeys.value.includes(venueKey)
  }

  async function load() {
    if (!auth.isLoggedIn) {
      venueKeys.value = []
      return
    }
    try {
      const response = await axios.get(`${BASE_URL}/users/me/favourites`, authConfig())
      venueKeys.value = response.data.map((venue) => venue.venueKey)
    } catch {
      // the cards just offer to save; saving a venue twice does nothing
    }
  }

  async function save(venue) {
    await axios.post(
      `${BASE_URL}/users/me/favourites`,
      {
        venueKey: venue.venueKey,
        name: venue.name,
        address: venue.address || '',
        lat: venue.lat,
        lng: venue.lng,
      },
      authConfig(),
    )
    venueKeys.value.push(venue.venueKey)
  }

  async function remove(venueKey) {
    const response = await axios.delete(
      `${BASE_URL}/users/me/favourites/${encodeURIComponent(venueKey)}`,
      authConfig(),
    )
    venueKeys.value = response.data.map((venue) => venue.venueKey)
  }

  return { venueKeys, isSaved, load, save, remove }
})
