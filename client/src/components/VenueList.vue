<!--
  FILE:     src/components/VenueList.vue
  OWNER:    S (team-written)
  PURPOSE:  Venues near the selected meeting point with type and distance filters
  PROPS:    lat, lng (Number)
  EMITS:    none
  SLOTS:    venue-actions ({ venue }): extra buttons inside each card
  TALKS TO: GET /api/venues?lat=&lng=&category=
            uses VenueCard
  DATA:     array of Venue:
            Venue { venueKey, name, address, lat, lng, category, distanceM }
  REVISE:   Wk 5 Axios GET + params, computed (filters), v-for
-->
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
const selectedType = ref('all') // 'all', or one category such as 'catering.cafe'
const maxDistance = ref(1000) // metres
const showAll = ref(false)
const firstShown = 6 // the page stays short: the rest wait behind "Show more places"
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

// Load as soon as the component is on the page
onMounted(() => {
  loadVenues()
  favourites.load() // once here, so each card can show whether it's saved
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
          <!-- lets the page add buttons to each card, e.g. voting on the results page -->
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
