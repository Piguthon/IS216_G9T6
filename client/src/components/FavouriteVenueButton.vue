<!-- OWNER: JX. Account action embedded in S's venue card. -->
<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useFavouritesStore } from '../stores/favourites'

const props = defineProps({ venue: { type: Object, required: true } })
const auth = useAuthStore()
const favourites = useFavouritesStore()
const SAVED_PAUSE_MS = 1500
const isBusy = ref(false)
const errorMessage = ref('')
// The mouse is still on the button after saving: this keeps it blue and ignores a double-click
const justSaved = ref(false)

const isSaved = computed(() => favourites.isSaved(props.venue.venueKey))

function errorText(error, fallback) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error
  }
  return fallback
}

async function saveFavourite() {
  try {
    await favourites.save(props.venue)
    justSaved.value = true
    setTimeout(() => {
      justSaved.value = false
    }, SAVED_PAUSE_MS)
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to save this venue. Please try again.')
  }
}

async function removeFavourite() {
  try {
    await favourites.remove(props.venue.venueKey)
  } catch (error) {
    errorMessage.value = errorText(error, 'Unable to remove this venue. Please try again.')
    await favourites.load() // it may already be gone, removed from another device
  }
}

async function toggleFavourite() {
  if (isBusy.value || justSaved.value) return
  isBusy.value = true
  errorMessage.value = ''
  if (isSaved.value) await removeFavourite()
  else await saveFavourite()
  isBusy.value = false
}
</script>

<template>
  <div class="mt-2">
    <button
      v-if="auth.isLoggedIn"
      type="button"
      class="app-btn app-btn-sm"
      :class="{
        'btn-sign-outline': !isSaved,
        'btn-sign favourite-saved': isSaved,
        'favourite-removable': isSaved && !justSaved,
      }"
      :disabled="isBusy"
      :aria-label="
        isSaved ? `Remove ${venue.name} from favourites` : `Save ${venue.name} to favourites`
      "
      data-testid="favourite-button"
      @click="toggleFavourite"
    >
      <template v-if="isBusy">{{ isSaved ? 'Removing...' : 'Saving...' }}</template>
      <template v-else-if="isSaved">
        <span class="favourite-label">Saved</span>
        <span class="favourite-remove">Remove</span>
      </template>
      <template v-else>Save to favourites</template>
    </button>
    <RouterLink v-else to="/login" class="small">Log in to save favourites</RouterLink>
    <p v-if="errorMessage" class="alert alert-danger small mt-2 mb-0" role="alert">
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
/* Wide enough for both words, so the button doesn't change size on hover */
.favourite-saved {
  min-width: 84px;
}

.favourite-remove {
  display: none;
}

.favourite-removable:focus-visible {
  border-color: #dc3545;
  background-color: #dc3545;
  color: #ffffff;
}

.favourite-removable:focus-visible .favourite-label {
  display: none;
}

.favourite-removable:focus-visible .favourite-remove {
  display: inline;
}

/* Only where a mouse can hover: on a phone a tap would leave the button stuck red */
@media (hover: hover) {
  .favourite-removable:hover {
    border-color: #dc3545;
    background-color: #dc3545;
    color: #ffffff;
  }

  .favourite-removable:hover .favourite-label {
    display: none;
  }

  .favourite-removable:hover .favourite-remove {
    display: inline;
  }
}
</style>
