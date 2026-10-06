<!--
  FILE:     src/components/MapView.vue
  OWNER:    P2 (team-written)
  PURPOSE:  Map of members' starts and candidate meeting points
  PROPS:    starts (Array of { name, lat, lng })
            candidates (Array of { stationId, name, lat, lng })
            selectedId (String)
  EMITS:    select with stationId
  TALKS TO: Leaflet (leafletjs.com, BSD-2-Clause) with OneMap base map tiles
            both must be credited in a comment and on the slides
  DATA:     coordinates are numbers
  REVISE:   Wk 5 onMounted (the map needs the DOM rendered first) · Wk 6 props/emits
  DONE WHEN:
    - [ ] markers for starts and candidates, visually different
    - [ ] clicking a candidate emits select
    - [ ] selected candidate highlighted
    - [ ] fits phone width
-->
<script setup>
// TODO (P2)
</script>

<template>
  <div data-testid="map-view">
    <!-- TODO (P2): build this component -->
  </div>
</template>
