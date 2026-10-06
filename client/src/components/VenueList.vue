<!--
  FILE:     src/components/VenueList.vue
  OWNER:    P2 (team-written)
  PURPOSE:  Venues near the selected meeting point with type and distance filters
            (rating filter later: decision D6)
  PROPS:    lat, lng (Number)
  EMITS:    none
  TALKS TO: GET /api/venues?lat=&lng=&category=
            uses VenueCard
  DATA:     array of Venue:
            Venue { name, address, lat, lng, category, distanceM }
  REVISE:   Wk 5 Axios GET + params, computed (filters), v-for
  DONE WHEN:
    - [ ] loads venues for the given point
    - [ ] filter by type and distance
    - [ ] empty state
    - [ ] testids
-->
<script setup>
// TODO (P2)
</script>

<template>
  <div data-testid="venue-list">
    <!-- TODO (P2): build this component -->
  </div>
</template>
