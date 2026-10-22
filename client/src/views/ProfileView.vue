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
import FavouriteVenueList from '../components/FavouriteVenueList.vue'
import AccountSettings from '../components/AccountSettings.vue'

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
const locationMessageTarget = ref('list')
const locationError = ref(false)
const searchKey = ref(0)
const locationsListKey = ref(0)
const showDeleteAccount = ref(false)
const deletionPassword = ref('')
const deletionMessage = ref('')
const isDeletingAccount = ref(false)
const showFinalDeleteConfirm = ref(false)

function confirmAccountDeletion() {
  if (!isDeletingAccount.value && !isSaving.value && deletionPassword.value) {
    showFinalDeleteConfirm.value = true
  }
}

async function deleteAccount() {
  if (isDeletingAccount.value || isSaving.value || !deletionPassword.value || !showFinalDeleteConfirm.value) return
  showFinalDeleteConfirm.value = false
  isDeletingAccount.value = true
  deletionMessage.value = ''
  try {
    await axios.delete(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: { password: deletionPassword.value },
    })
    auth.clearSession()
    router.push('/signup')
  } catch (error) {
    if (error.response && error.response.status === 401) {
      auth.clearSession()
      router.push('/login')
    }
    deletionMessage.value = 'Unable to delete your account. Please try again.'
    if (error.response && error.response.data && error.response.data.error) {
      deletionMessage.value = error.response.data.error
    }
  } finally {
    deletionPassword.value = ''
    isDeletingAccount.value = false
  }
}
const initials = computed(() => {
  if (!user.value) return ''
  return user.value.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
})

function showLocationError(error) {
  locationError.value = true
  if (error.response && error.response.status === 401) {
    auth.clearSession()
    router.push('/login')
  }
  locationMessage.value = 'Unable to update saved locations. Please try again.'
  if (error.response && error.response.data && error.response.data.error) {
    locationMessage.value = error.response.data.error
  }
}

async function addLocation() {
  if (isSaving.value || !selectedAddress.value || !nickname.value.trim()) return
  locationMessageTarget.value = 'add'
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

async function renameLocation(id, label, replacementAddress) {
  if (isSaving.value) return
  locationMessageTarget.value = 'list'
  isSaving.value = true
  locationMessage.value = ''
  try {
    const details = { label }
    if (replacementAddress) {
      details.address = replacementAddress.label
      details.postal = replacementAddress.postal
      details.lat = replacementAddress.lat
      details.lng = replacementAddress.lng
    }
    const response = await axios.put(`${BASE_URL}/users/me/locations/${id}`, details, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    locations.value = response.data
    locationError.value = false
    locationMessage.value = 'Location updated.'
    locationsListKey.value++
  } catch (error) {
    showLocationError(error)
  } finally {
    isSaving.value = false
  }
}

async function setDefaultLocation(id) {
  if (isSaving.value) return
  locationMessageTarget.value = 'list'
  isSaving.value = true
  locationMessage.value = ''
  try {
    const response = await axios.put(`${BASE_URL}/users/me/locations/${id}/default`, {}, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    locations.value = response.data
    locationError.value = false
    locationMessage.value = 'Default location updated.'
  } catch (error) {
    showLocationError(error)
  } finally {
    isSaving.value = false
  }
}

async function deleteLocation(id) {
  if (isSaving.value) return
  locationMessageTarget.value = 'list'
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
    auth.clearSession()
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
      auth.clearSession()
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

    <p v-if="isLoading" role="status">Loading your profile…</p>

    <div v-else-if="message" class="alert alert-danger" role="alert">
      <p class="mb-2">{{ message }}</p>
      <button type="button" class="btn btn-outline-danger btn-sm" @click="loadProfile">
        Try again
      </button>
    </div>

    <div v-else-if="user && auth.isLoggedIn" class="row g-4">
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
            <p v-if="locationMessage && locationMessageTarget === 'list'" :class="locationError ? 'alert alert-danger' : 'alert alert-success'" :role="locationError ? 'alert' : 'status'">{{ locationMessage }}</p>
            <SavedLocationList :key="locationsListKey" :locations="locations" :busy="isSaving"
              @rename="renameLocation" @delete="deleteLocation" @default="setDefaultLocation" />
          </div>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body p-4">
            <h2 class="h5 mb-3">Add a location</h2>
            <form @submit.prevent="addLocation" @keydown.enter.prevent>
              <fieldset :disabled="isSaving">
                <label for="location-nickname" class="form-label">Name</label>
                <input id="location-nickname" v-model.trim="nickname" class="form-control mb-3"
                  placeholder="e.g. Home, School or Work" maxlength="60" required />
                <p class="form-label mb-2">Search address or postal code</p>
                <AddressSearch :key="searchKey" @select="selectedAddress = $event" @clear="selectedAddress = null" />
                <button type="submit" class="btn btn-primary mt-3" :disabled="isSaving || !nickname || !selectedAddress">
                  {{ isSaving ? 'Saving...' : 'Save location' }}
                </button>
              </fieldset>
              <p v-if="locationMessage && locationMessageTarget === 'add'" class="alert mt-3 mb-0"
                :class="locationError ? 'alert-danger' : 'alert-success'" :role="locationError ? 'alert' : 'status'">{{ locationMessage }}</p>
            </form>
          </div>
        </div>
        <FavouriteVenueList />
        <AccountSettings :user="user" @updated="user = $event" />
        <div class="card border-0 shadow-sm mt-4">
          <div class="card-body p-4">
            <button v-if="!showDeleteAccount" type="button" class="btn btn-outline-danger"
              @click="showDeleteAccount = true">Delete my account</button>
            <form v-else @submit.prevent="confirmAccountDeletion">
              <label for="deletion-password" class="form-label">Confirm your current password</label>
              <input id="deletion-password" v-model="deletionPassword" type="password"
                class="form-control mb-3" autocomplete="current-password" required :disabled="isDeletingAccount || showFinalDeleteConfirm" />
              <p v-if="deletionMessage" class="alert alert-danger" role="alert">{{ deletionMessage }}</p>
              <button type="submit" class="btn btn-danger me-2" :disabled="isDeletingAccount || isSaving || !deletionPassword || showFinalDeleteConfirm">
                {{ isDeletingAccount ? 'Deleting...' : 'Permanently delete account' }}
              </button>
              <button type="button" class="btn btn-outline-secondary" :disabled="isDeletingAccount"
                @click="showDeleteAccount = false; showFinalDeleteConfirm = false; deletionPassword = ''; deletionMessage = ''">Cancel</button>
              <div v-if="showFinalDeleteConfirm" class="alert alert-secondary mt-3 mb-0" role="alert">
                <p class="text-danger">Permanently delete your account? This cannot be undone.</p>
                <button type="button" class="btn btn-danger me-2" @click="deleteAccount">Confirm</button>
                <button type="button" class="btn btn-outline-secondary" @click="showFinalDeleteConfirm = false">Cancel</button>
              </div>
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
