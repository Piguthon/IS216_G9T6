<!-- OWNER: JX. Load account locations and emit the existing meetup start-point shape. -->
<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits(['select'])
const auth = useAuthStore()
const locations = ref([])
const selectedId = ref('')
const isLoading = ref(true)
const message = ref('')

async function loadLocations() {
  isLoading.value = true
  message.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/users/me/locations`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    locations.value = response.data
    const defaultLocation = locations.value.find(location => location.isDefault)
    if (defaultLocation) selectedId.value = defaultLocation._id
  } catch {
    message.value = 'Unable to load saved locations. You can still search for an address below.'
  } finally {
    isLoading.value = false
  }
}

function chooseLocation() {
  const location = locations.value.find(item => item._id === selectedId.value)
  if (!location) return
  emit('select', {
    label: location.address || location.label,
    postal: location.postal, lat: location.lat, lng: location.lng,
  })
  selectedId.value = ''
}

onMounted(loadLocations)
</script>

<template>
  <div class="mb-3">
    <p v-if="isLoading" class="small text-muted" role="status">Loading saved starting points...</p>
    <div v-else-if="message" class="alert alert-danger small" role="alert">
      <p class="mb-1">{{ message }}</p>
      <button type="button" class="btn btn-link btn-sm p-0" @click="loadLocations">Try again</button>
    </div>
    <div v-else-if="locations.length">
      <label for="saved-start-point" class="form-label">Choose a saved starting point</label>
      <select id="saved-start-point" v-model="selectedId" class="form-select"
        data-testid="saved-start-picker">
        <option value="" disabled>Select Home, School or another saved location</option>
        <option v-for="location in locations" :key="location._id" :value="location._id">
          {{ location.label }}{{ location.isDefault ? ' (default)' : '' }} — {{ location.address || location.label }}
        </option>
      </select>
      <button v-if="selectedId" type="button" class="btn btn-outline-primary btn-sm mt-2"
        @click="chooseLocation">Use</button>
    </div>
    <p v-else class="small text-muted mb-0">No saved starting points yet. Add them in <RouterLink to="/profile">Profile</RouterLink>, or search below.</p>
  </div>
</template>
