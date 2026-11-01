<!-- OWNER: JX. Load account locations and emit the existing meetup start-point shape. -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'

// currentStart: this member's start point in the meetup, or null
const props = defineProps({ currentStart: { type: Object, default: null } })
const emit = defineEmits(['select'])
const auth = useAuthStore()
const locations = ref([])
const isLoading = ref(true)
const message = ref('')
const wantsSearch = ref(false)

// Taken from the saved start point, so a failed save never shows as selected
const selectedId = computed(() => {
  if (!props.currentStart) return ''
  const match = locations.value.find(
    (location) =>
      location.lat === props.currentStart.lat && location.lng === props.currentStart.lng,
  )
  return match ? match._id : ''
})

const showSearch = computed(() => !isLoading.value && (!selectedId.value || wantsSearch.value))

async function loadLocations() {
  isLoading.value = true
  message.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/users/me/locations`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    locations.value = response.data
  } catch {
    message.value = 'Unable to load saved locations. You can still search for an address below.'
  } finally {
    isLoading.value = false
  }
}

function chooseLocation(location) {
  wantsSearch.value = false
  if (location._id === selectedId.value) return
  emit('select', {
    label: location.address || location.label,
    postal: location.postal,
    lat: location.lat,
    lng: location.lng,
  })
}

onMounted(loadLocations)
</script>

<template>
  <div>
    <p v-if="isLoading" class="small text-muted" role="status">Loading saved starting points...</p>
    <div v-else-if="message" class="alert alert-danger small" role="alert">
      <p class="mb-1">{{ message }}</p>
      <button type="button" class="btn btn-link btn-sm p-0" @click="loadLocations">
        Try again
      </button>
    </div>
    <div v-else-if="locations.length" class="d-flex flex-wrap gap-2 mb-3">
      <button
        v-for="location in locations"
        :key="location._id"
        type="button"
        class="app-btn"
        :class="location._id === selectedId ? 'btn-sign' : 'btn-sign-outline'"
        :aria-pressed="location._id === selectedId"
        :title="location.address || location.label"
        data-testid="saved-start-option"
        @click="chooseLocation(location)"
      >
        {{ location.label }}
      </button>
    </div>
    <p v-else class="small text-muted">
      No saved starting points yet. Add them in <RouterLink to="/profile">Profile</RouterLink>, or
      search below.
    </p>

    <!-- The parent puts the address search here. It goes away once a saved location is chosen. -->
    <slot v-if="showSearch"></slot>
    <button
      v-else-if="selectedId"
      type="button"
      class="btn btn-link btn-sm p-0"
      data-testid="saved-start-other"
      @click="wantsSearch = true"
    >
      Use a different address
    </button>
  </div>
</template>
