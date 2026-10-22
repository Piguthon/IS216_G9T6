<!-- OWNER: JX. Account action embedded in S's venue card. -->
<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'

const props = defineProps({ venue: { type: Object, required: true } })
const auth = useAuthStore()
const isSaving = ref(false)
const message = ref('')
const hasError = ref(false)

async function saveFavourite() {
  if (isSaving.value) return
  isSaving.value = true
  message.value = ''
  try {
    await axios.post(`${BASE_URL}/users/me/favourites`, {
      venueKey: props.venue.venueKey, name: props.venue.name,
      address: props.venue.address || '', lat: props.venue.lat, lng: props.venue.lng,
    }, { headers: { Authorization: `Bearer ${auth.token}` } })
    hasError.value = false
    message.value = 'Saved to favourites.'
  } catch (error) {
    hasError.value = true
    message.value = 'Unable to save this venue. Please try again.'
    if (error.response && error.response.data && error.response.data.error) {
      message.value = error.response.data.error
    }
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="mt-2">
    <button v-if="auth.isLoggedIn" type="button" class="btn btn-outline-primary btn-sm"
      :disabled="isSaving" @click="saveFavourite">{{ isSaving ? 'Saving...' : 'Save to favourites' }}</button>
    <RouterLink v-else to="/login" class="small">Log in to save favourites</RouterLink>
    <p v-if="message" class="alert small mt-2 mb-0" :class="hasError ? 'alert-danger' : 'alert-success'" :role="hasError ? 'alert' : 'status'">{{ message }}</p>
  </div>
</template>
