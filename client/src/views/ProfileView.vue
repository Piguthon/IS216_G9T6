<!--
  FILE:     src/views/ProfileView.vue
  OWNER:    JX (team-written)
  PURPOSE:  Account details and saved start locations, in one card with three tabs
  ROUTE:    /profile
  TALKS TO: GET /api/users/me; GET/POST/PUT/DELETE /api/users/me/locations
  DATA:     { user: { _id, name, email } }
  REVISE:   Wk 5 Axios with Authorization header · Wk 6 components
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
const accountSettings = ref(null)
const isDeletingAccount = ref(false)
const showFinalDeleteConfirm = ref(false)
const activeTab = ref('locations')
const showAddForm = ref(false)

const tabs = computed(() => [
  { id: 'locations', label: `Locations (${locations.value.length})` },
  { id: 'favourites', label: 'Favourites' },
  { id: 'account', label: 'Account' },
])

function closeAddForm() {
  showAddForm.value = false
  nickname.value = ''
  selectedAddress.value = null
  searchKey.value++
}

function confirmAccountDeletion() {
  if (!isDeletingAccount.value && !isSaving.value && deletionPassword.value) {
    showFinalDeleteConfirm.value = true
  }
}

async function deleteAccount() {
  if (
    isDeletingAccount.value ||
    isSaving.value ||
    !deletionPassword.value ||
    !showFinalDeleteConfirm.value
  )
    return
  showFinalDeleteConfirm.value = false
  isDeletingAccount.value = true
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
    let text = 'Unable to delete your account. Please try again.'
    if (error.response && error.response.data && error.response.data.error) {
      text = error.response.data.error
    }
    accountSettings.value?.showMessage(text, true)
  } finally {
    deletionPassword.value = ''
    isDeletingAccount.value = false
  }
}
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
    const response = await axios.post(
      `${BASE_URL}/users/me/locations`,
      {
        label: nickname.value.trim(),
        address: address.label,
        postal: address.postal,
        lat: address.lat,
        lng: address.lng,
      },
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    locations.value = response.data
    closeAddForm()
    locationMessageTarget.value = 'list'
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
    const response = await axios.put(
      `${BASE_URL}/users/me/locations/${id}/default`,
      {},
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    )
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
  <section class="row justify-content-center" data-testid="profile-page">
    <div class="col-lg-9">
      <header class="app-page-header">
        <h1 class="app-heading text-break mb-1" data-testid="profile-name">
          {{ user ? user.name : 'Your profile' }}
        </h1>
        <p v-if="user" class="text-muted text-break mb-0" data-testid="profile-email">
          {{ user.email }}
        </p>
      </header>

      <p v-if="isLoading" role="status">Loading your profile…</p>

      <div v-else-if="message" class="alert alert-danger" role="alert">
        <p class="mb-2">{{ message }}</p>
        <button
          type="button"
          class="btn app-btn btn-outline-danger app-btn-sm"
          @click="loadProfile"
        >
          Try again
        </button>
      </div>

      <div v-else-if="user && auth.isLoggedIn" class="card app-card">
        <!-- Bootstrap navs (https://getbootstrap.com/docs/5.3/components/navs-tabs/) -->
        <ul class="nav nav-fill app-tabs" role="tablist">
          <li v-for="tab in tabs" :key="tab.id" class="nav-item" role="presentation">
            <button
              type="button"
              class="nav-link"
              :class="{ active: activeTab === tab.id }"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :data-testid="`profile-tab-${tab.id}`"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </li>
        </ul>

        <!-- v-show keeps half-typed forms when you switch tabs -->
        <div v-show="activeTab === 'locations'" class="card-body p-3 p-md-4" role="tabpanel">
          <p
            v-if="locationMessage && locationMessageTarget === 'list'"
            :class="locationError ? 'alert alert-danger' : 'alert alert-success'"
            :role="locationError ? 'alert' : 'status'"
          >
            {{ locationMessage }}
          </p>
          <SavedLocationList
            :key="locationsListKey"
            :locations="locations"
            :busy="isSaving"
            @rename="renameLocation"
            @delete="deleteLocation"
            @default="setDefaultLocation"
          />
          <button
            v-if="!showAddForm"
            type="button"
            class="app-btn btn-sign mt-3"
            data-testid="location-add"
            @click="showAddForm = true"
          >
            Add a location
          </button>
          <form
            v-else
            class="bg-body-tertiary rounded-3 p-3 mt-3"
            @submit.prevent="addLocation"
            @keydown.enter.prevent
          >
            <fieldset :disabled="isSaving">
              <label for="location-nickname" class="form-label fw-bold">Name</label>
              <input
                id="location-nickname"
                v-model.trim="nickname"
                class="form-control app-input mb-3"
                placeholder="e.g. Home, School or Work"
                maxlength="60"
                required
              />
              <p class="form-label fw-bold mb-2">Search address or postal code</p>
              <AddressSearch
                :key="searchKey"
                @select="selectedAddress = $event"
                @clear="selectedAddress = null"
              />
              <div class="d-flex gap-2 mt-3">
                <button
                  type="submit"
                  class="app-btn btn-sign"
                  :disabled="isSaving || !nickname || !selectedAddress"
                >
                  {{ isSaving ? 'Saving...' : 'Save location' }}
                </button>
                <button type="button" class="app-btn btn-quiet" @click="closeAddForm">
                  Cancel
                </button>
              </div>
            </fieldset>
            <p
              v-if="locationMessage && locationMessageTarget === 'add'"
              class="alert mt-3 mb-0"
              :class="locationError ? 'alert-danger' : 'alert-success'"
              :role="locationError ? 'alert' : 'status'"
            >
              {{ locationMessage }}
            </p>
          </form>
        </div>

        <div v-show="activeTab === 'favourites'" class="card-body p-3 p-md-4" role="tabpanel">
          <FavouriteVenueList />
        </div>

        <div v-show="activeTab === 'account'" class="card-body p-3 p-md-4" role="tabpanel">
          <AccountSettings ref="accountSettings" :user="user" @updated="user = $event">
            <div class="border-top pt-3 mt-4">
              <button
                v-if="!showDeleteAccount"
                type="button"
                class="btn app-btn btn-outline-danger"
                @click="showDeleteAccount = true"
              >
                Delete my account
              </button>
              <form v-else @submit.prevent="confirmAccountDeletion">
                <label for="deletion-password" class="form-label fw-bold"
                  >Confirm your current password</label
                >
                <input
                  id="deletion-password"
                  v-model="deletionPassword"
                  type="password"
                  class="form-control app-input mb-3"
                  autocomplete="current-password"
                  required
                  :disabled="isDeletingAccount || showFinalDeleteConfirm"
                />
                <div class="d-flex flex-wrap gap-2">
                  <button
                    type="submit"
                    class="btn app-btn btn-danger"
                    :disabled="
                      isDeletingAccount || isSaving || !deletionPassword || showFinalDeleteConfirm
                    "
                  >
                    {{ isDeletingAccount ? 'Deleting...' : 'Permanently delete account' }}
                  </button>
                  <button
                    type="button"
                    class="app-btn btn-quiet"
                    :disabled="isDeletingAccount"
                    @click="
                      ((showDeleteAccount = false),
                      (showFinalDeleteConfirm = false),
                      (deletionPassword = ''))
                    "
                  >
                    Cancel
                  </button>
                </div>
                <div
                  v-if="showFinalDeleteConfirm"
                  class="alert alert-secondary mt-3 mb-0"
                  role="alert"
                >
                  <p class="text-danger">Permanently delete your account? This cannot be undone.</p>
                  <button type="button" class="btn app-btn btn-danger me-2" @click="deleteAccount">
                    Confirm
                  </button>
                  <button
                    type="button"
                    class="app-btn btn-quiet"
                    @click="showFinalDeleteConfirm = false"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </AccountSettings>
        </div>
      </div>
    </div>
  </section>
</template>
