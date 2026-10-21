<!--
  FILE:     src/views/ProfileView.vue
  OWNER:    JX (team-written)
  PURPOSE:  Account details and saved start locations
  ROUTE:    /profile
  TALKS TO: GET /api/users/me; GET/POST/PUT/DELETE /api/users/me/locations
  DATA:     { user: { _id, name, email } }
  REVISE:   Wk 5 Axios with Authorization header · Wk 6 components
  DONE WHEN:
    - [x] account details and saved-location CRUD
    - [ ] redirect to /login if not logged in
    - [ ] responsive
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import AddressSearch from '../components/AddressSearch.vue'
import SavedLocationList from '../components/SavedLocationList.vue'

const router = useRouter()
const auth = useAuthStore()
const user = ref(null)
const message = ref('')
const isLoading = ref(true)
const locations = ref([])
const nickname = ref('')
const selectedAddress = ref(null)
const isSaving = ref(false)
const locationMessage = ref('')
const locationError = ref(false)
const searchKey = ref(0)
const initials = computed(() => {
  if (!user.value) return ''
  return user.value.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
})

function showLocationError(error) {
  locationError.value = true
  if (error.response && error.response.status === 401) {
    auth.logout()
    router.push('/login')
  }
  locationMessage.value = 'Unable to update saved locations. Please try again.'
  if (error.response && error.response.data && error.response.data.error) {
    locationMessage.value = error.response.data.error
  }
}

async function addLocation() {
  if (isSaving.value || !selectedAddress.value || !nickname.value.trim()) return
  isSaving.value = true
  locationMessage.value = ''
  try {
    const address = selectedAddress.value
    const response = await axios.post(`${BASE_URL}/users/me/locations`, {
      label: nickname.value.trim(), address: address.label,
      postal: address.postal, lat: address.lat, lng: address.lng,
    }, { headers: { Authorization: `Bearer ${auth.token}` } })
    locations.value = response.data
    nickname.value = ''
    selectedAddress.value = null
    searchKey.value++
    locationError.value = false
    locationMessage.value = 'Location saved.'
  } catch (error) {
    showLocationError(error)
  } finally {
    isSaving.value = false
  }
}

async function renameLocation(id, label) {
  if (isSaving.value) return
  isSaving.value = true
  locationMessage.value = ''
  try {
    const response = await axios.put(`${BASE_URL}/users/me/locations/${id}`, { label }, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    locations.value = response.data
    locationError.value = false
    locationMessage.value = 'Location renamed.'
  } catch (error) {
    showLocationError(error)
  } finally {
    isSaving.value = false
  }
}

async function deleteLocation(id) {
  if (isSaving.value) return
  isSaving.value = true
  locationMessage.value = ''
  try {
    const response = await axios.delete(`${BASE_URL}/users/me/locations/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    locations.value = response.data
    locationError.value = false
    locationMessage.value = 'Location deleted.'
  } catch (error) {
    showLocationError(error)
  } finally {
    isSaving.value = false
  }
}

async function loadProfile() {
  const token = auth.token
  if (!token) {
    isLoading.value = false
    auth.logout()
    router.push('/login')
    return
  }

  message.value = ''
  isLoading.value = true

  try {
    const response = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    user.value = response.data.user
    const locationsResponse = await axios.get(`${BASE_URL}/users/me/locations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    locations.value = locationsResponse.data
  } catch (error) {
    if (error.response && error.response.status === 401) {
      auth.logout()
      router.push('/login')
      return
    }

    if (error.response && error.response.data && error.response.data.error) {
      message.value = error.response.data.error
    } else {
      message.value = 'Unable to load your profile. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <section data-testid="profile-page">
    <h1 class="h3 mb-2">Your profile</h1>
    <p class="text-muted mb-4">Your account and familiar starting points, all in one place.</p>

    <p v-if="isLoading" role="status">Loading your profile…</p>

    <div v-else-if="message" class="alert alert-danger" role="alert">
      <p class="mb-2">{{ message }}</p>
      <button type="button" class="btn btn-outline-danger btn-sm" @click="loadProfile">
        Try again
      </button>
    </div>

    <div v-else-if="user" class="row g-4">
      <div class="col-lg-4">
        <div class="card shadow-sm border-0">
          <div class="card-body p-4">
            <span class="profile-avatar bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold mb-3" aria-hidden="true">{{ initials }}</span>
            <h2 class="h5" data-testid="profile-name">{{ user.name }}</h2>
            <p class="text-muted text-break" data-testid="profile-email">{{ user.email }}</p>
            <hr />
            <p class="mb-0"><strong>{{ locations.length }}</strong> saved locations</p>
          </div>
        </div>
      </div>
      <div class="col-lg-8">
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-body p-4">
            <h2 class="h5">Saved locations</h2>
            <p class="text-muted small">Keep the places you usually travel from.</p>
            <p v-if="locationMessage" :class="locationError ? 'alert alert-danger' : 'alert alert-success'" role="status">{{ locationMessage }}</p>
            <SavedLocationList :locations="locations" :busy="isSaving"
              @rename="renameLocation" @delete="deleteLocation" />
          </div>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body p-4">
            <h2 class="h5 mb-3">Add a location</h2>
            <form @submit.prevent="addLocation" @keydown.enter.prevent>
              <fieldset :disabled="isSaving">
                <label for="location-nickname" class="form-label">Nickname</label>
                <input id="location-nickname" v-model.trim="nickname" class="form-control mb-3"
                  placeholder="e.g. Home, School or Work" maxlength="60" required />
                <p class="form-label mb-2">Search address or postal code</p>
                <AddressSearch :key="searchKey" @select="selectedAddress = $event" @clear="selectedAddress = null" />
                <button type="submit" class="btn btn-primary mt-3" :disabled="isSaving || !nickname || !selectedAddress">
                  {{ isSaving ? 'Saving...' : 'Save location' }}
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-avatar {
  width: 64px;
  height: 64px;
  font-size: 1.5rem;
}
</style>
