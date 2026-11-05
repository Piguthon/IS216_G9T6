<!-- Venues near the selected meeting point, with type and distance filters. -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useFavouritesStore } from '../stores/favourites'
import VenueCard from './VenueCard.vue'

const props = defineProps({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
})

const venues = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const selectedType = ref('all')
const maxDistance = ref(1000)
const showAll = ref(false)
const firstShown = 6
const favourites = useFavouritesStore()

// Loads every type of place around the point once; the filters below work on this list
async function loadVenues() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await axios.get(`${BASE_URL}/venues`, {
      params: { lat: props.lat, lng: props.lng },
    })
    venues.value = response.data
  } catch {
    errorMessage.value = 'Could not load places near this point. Please try again.'
  }

  isLoading.value = false
}

onMounted(() => {
  loadVenues()
  favourites.load()
})

// The venues that match both filters (recalculates whenever a filter or the list changes)
const filteredVenues = computed(() => {
  const result = []
  for (const venue of venues.value) {
    const isRightType = selectedType.value === 'all' || venue.category === selectedType.value
    const isCloseEnough = venue.distanceM <= maxDistance.value
    if (isRightType && isCloseEnough) {
      result.push(venue)
    }
  }
  return result
})

const shownVenues = computed(() =>
  showAll.value ? filteredVenues.value : filteredVenues.value.slice(0, firstShown),
)
</script>

<template>
  <section data-testid="venue-list">
    <div class="d-flex flex-wrap gap-2 mb-3">
      <select
        v-model="selectedType"
        class="form-select app-input w-auto"
        aria-label="Type of place"
        data-testid="venue-type-filter"
      >
        <option value="all">All types</option>
        <option value="catering.restaurant">Restaurants</option>
        <option value="catering.cafe">Cafés</option>
        <option value="catering.food_court">Food courts</option>
        <option value="commercial.shopping_mall">Malls</option>
      </select>
      <select
        v-model="maxDistance"
        class="form-select app-input w-auto"
        aria-label="How far"
        data-testid="venue-distance-filter"
      >
        <option :value="300">Within 300 m</option>
        <option :value="500">Within 500 m</option>
        <option :value="1000">Within 1 km</option>
      </select>
    </div>

    <div v-if="isLoading" class="text-center my-4" data-testid="venue-loading">
      <div class="spinner-border text-sign" role="status">
        <span class="visually-hidden">Loading places…</span>
      </div>
    </div>
    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="venue-error">
      {{ errorMessage }}
    </div>
    <p v-else-if="filteredVenues.length === 0" class="app-empty" data-testid="venue-empty">
      No places match these filters. Try a bigger distance.
    </p>
    <div v-else class="row g-3">
      <div v-for="venue in shownVenues" :key="venue.venueKey" class="col-12 col-md-6">
        <VenueCard :venue="venue">
          <slot name="venue-actions" :venue="venue"></slot>
        </VenueCard>
      </div>
    </div>
    <button
      v-if="!isLoading && !errorMessage && !showAll && filteredVenues.length > firstShown"
      type="button"
      class="app-btn btn-quiet w-100 mt-3"
      data-testid="venue-show-more"
      @click="showAll = true"
    >
      Show more places ({{ filteredVenues.length - firstShown }})
    </button>
  </section>
</template>
