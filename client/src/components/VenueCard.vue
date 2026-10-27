<!--
  FILE:     src/components/VenueCard.vue
  OWNER:    S (team-written)
  PURPOSE:  One venue
  PROPS:    venue (Object)
  EMITS:    none
  SLOT:     for actions (e.g. a vote button later)
  TALKS TO: none
  DATA:     Venue { venueKey, name, address, lat, lng, category, distanceM, avgRating }
  REVISE:   Wk 6 props, slots · Wk 3 cards
  DONE WHEN:
    - [ ] name, type, address, distance
    - [ ] Bootstrap card
-->
<script setup>
import { computed } from 'vue'
import FavouriteVenueButton from './FavouriteVenueButton.vue'

const props = defineProps({
  venue: { type: Object, required: true },
})

// Words people recognise for the Geoapify categories FairSpot asks for
const TYPE_LABELS = {
  'catering.restaurant': 'Restaurant',
  'catering.cafe': 'Café',
  'catering.food_court': 'Food court',
  'commercial.shopping_mall': 'Mall',
}

// 4.1: the label for this venue's category, or 'Place' for anything not in the list
const typeLabel = computed(() => TYPE_LABELS[props.venue.category] || 'Place')

// 4.2: 350 → '350 m', 1200 → '1.2 km', '' when there's no distance
const distanceLabel = computed(() => {
  const metres = props.venue.distanceM
  if (metres === null || metres === undefined) {
    return ''
  }
  if (metres < 1000) {
    return metres + ' m'
  }
  return (metres / 1000).toFixed(1) + ' km'
})
</script>

<template>
  <div class="card app-card h-100" data-testid="venue-card">
    <div class="card-body d-flex flex-column gap-1">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <h3 class="h6 app-heading mb-0" data-testid="venue-name">{{ venue.name }}</h3>
        <span
          class="badge rounded-pill text-uppercase text-bg-light border"
          data-testid="venue-type"
          >{{ typeLabel }}</span
        >
      </div>
      <p class="small text-muted mb-0" data-testid="venue-address">{{ venue.address }}</p>
      <p v-if="distanceLabel" class="small mb-0" data-testid="venue-distance">
        {{ distanceLabel }} away
      </p>
      <slot></slot>
      <FavouriteVenueButton :key="venue.venueKey" :venue="venue" />
    </div>
  </div>
</template>
