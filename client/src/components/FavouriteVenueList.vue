<!-- OWNER: JX. Favourite meeting destinations, separate from saved starting locations. -->
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const venues = ref([])
const isLoading = ref(true)
const isRemoving = ref(false)
const message = ref('')

function showError(error) {
  message.value = 'Unable to load or update favourites. Please try again.'
  if (error.response && error.response.data && error.response.data.error) {
    message.value = error.response.data.error
  }
}

async function loadFavourites() {
  isLoading.value = true
  message.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/users/me/favourites`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    venues.value = response.data
  } catch (error) {
    showError(error)
  } finally {
    isLoading.value = false
  }
}

async function removeFavourite(venueKey) {
  if (isRemoving.value) return
  isRemoving.value = true
  message.value = ''
  try {
    const response = await axios.delete(
      `${BASE_URL}/users/me/favourites/${encodeURIComponent(venueKey)}`,
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    )
    venues.value = response.data
  } catch (error) {
    showError(error)
  } finally {
    isRemoving.value = false
  }
}

onMounted(loadFavourites)
</script>

<template>
  <div class="card shadow-sm border-0 mt-4" data-testid="favourite-venues">
    <div class="card-body p-4">
      <h2 class="h5">Favourite venues</h2>
      <p v-if="isLoading" role="status">Loading favourites...</p>
      <div v-else-if="message" class="alert alert-danger" role="alert">
        <p>{{ message }}</p>
        <button type="button" class="btn btn-outline-danger btn-sm" @click="loadFavourites">
          Try again
        </button>
      </div>
      <p v-else-if="venues.length === 0" class="text-muted mb-0">
        No favourites yet. Save a venue from the meetup results to see it here.
      </p>
      <ul v-else class="list-group list-group-flush">
        <li
          v-for="venue in venues"
          :key="venue.venueKey"
          class="list-group-item px-0 d-flex flex-wrap justify-content-between gap-3"
        >
          <div>
            <h3 class="h6 mb-1">{{ venue.name }}</h3>
            <p class="small text-muted mb-0">{{ venue.address }}</p>
          </div>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm align-self-start"
            :disabled="isRemoving"
            :aria-label="`Remove ${venue.name} from favourites`"
            @click="removeFavourite(venue.venueKey)"
          >
            Remove favourite
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
