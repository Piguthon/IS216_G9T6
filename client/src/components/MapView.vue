<!--
  FILE:     src/components/MapView.vue
  OWNER:    S (team-written)
  PURPOSE:  Map of members' starts and candidate meeting points
  PROPS:    starts (Array of { name, lat, lng })
            candidates (Array of { stationId, name, lat, lng })
            selectedId (String)
            routeSteps (Array of steps from the ranking, drawn as a line for one person's route)
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
// Map: Leaflet (https://leafletjs.com, BSD-2-Clause)
// Base map tiles: OneMap (https://www.onemap.gov.sg), © contributors | Singapore Land Authority
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decodePolyline } from '../utils/polyline'

const props = defineProps({
  starts: { type: Array, default: () => [] },
  candidates: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
  routeSteps: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])

const ONEMAP_TILES = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'
const ONEMAP_CREDIT =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
const SINGAPORE = [1.3521, 103.8198]

// Marker colours from the FairSpot theme (Leaflet draws SVG, so these must be real colour values)
const START_COLOUR = '#64748b' // grey: members' start points
const CANDIDATE_COLOUR = '#0f766e' // teal: candidate stations
const SELECTED_COLOUR = '#f59e0b' // amber: the selected station
const WALK_COLOUR = '#64748b' // grey dashes: walking
const BUS_COLOUR = '#0e8560' // green: bus
const TRAIN_COLOUR = '#1d4f91' // blue: train
const CAR_COLOUR = '#7c3aed' // purple: car

const mapElement = ref(null) // the <div> in the template; Leaflet draws inside it
let map = null // the Leaflet map: a plain variable, because Vue doesn't need to track it

onMounted(() => {
  map = L.map(mapElement.value).setView(SINGAPORE, 12)
  L.tileLayer(ONEMAP_TILES, { minZoom: 11, maxZoom: 19, attribution: ONEMAP_CREDIT }).addTo(map)

  const points = [] // every [lat, lng] drawn, used to fit the view at the end

  // A line for each part of the route, drawn first so the dots stay on top
  for (const step of props.routeSteps) {
    if (!step.points) continue
    const line = decodePolyline(step.points)
    const isWalk = step.mode === 'WALK'
    const lineColour = step.mode === 'CAR' ? CAR_COLOUR : TRAIN_COLOUR
    L.polyline(line, {
      color: isWalk ? WALK_COLOUR : step.mode === 'BUS' ? BUS_COLOUR : lineColour,
      weight: isWalk ? 4 : 6,
      opacity: 0.9,
      dashArray: isWalk ? '4 8' : null,
    }).addTo(map)
    points.push(...line)
  }

  // 6.1: a grey dot for each member's start point
  for (const start of props.starts) {
    if (typeof start.lat !== 'number' || typeof start.lng !== 'number') {
      continue // a member without a start yet
    }
    L.circleMarker([start.lat, start.lng], {
      radius: 7,
      color: START_COLOUR,
      fillColor: START_COLOUR,
      fillOpacity: 0.9,
    })
      .bindTooltip(start.name)
      .addTo(map)
    points.push([start.lat, start.lng])
  }

  // 6.2 + 6.3: a teal dot for each candidate station; the selected one is bigger and amber
  for (const candidate of props.candidates) {
    const isSelected = candidate.stationId === props.selectedId
    const colour = isSelected ? SELECTED_COLOUR : CANDIDATE_COLOUR
    L.circleMarker([candidate.lat, candidate.lng], {
      radius: isSelected ? 11 : 8,
      weight: isSelected ? 3 : 2,
      color: colour,
      fillColor: colour,
      fillOpacity: 0.9,
    })
      .bindTooltip(candidate.name)
      .on('click', () => emit('select', candidate.stationId))
      .addTo(map)
    points.push([candidate.lat, candidate.lng])
  }

  // 6.4: zoom so every dot fits, with a little space around the edges
  if (points.length > 0) {
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
  }
})

onUnmounted(() => {
  if (map) map.remove()
})
</script>

<template>
  <div ref="mapElement" class="map-view" data-testid="map-view"></div>
</template>

<style scoped>
.map-view {
  height: 360px; /* Leaflet needs a real height, or the map is 0px tall */
  width: 100%;
  border-radius: var(--bs-border-radius);
}
</style>
