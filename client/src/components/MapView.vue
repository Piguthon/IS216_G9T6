<!-- Map of members' start points and the candidate meeting points. -->
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

const START_COLOUR = '#64748b'
const CANDIDATE_COLOUR = '#0f766e'
const SELECTED_COLOUR = '#f59e0b'
const WALK_COLOUR = '#64748b'
const BUS_COLOUR = '#0e8560'
const TRAIN_COLOUR = '#1d4f91'
const CAR_COLOUR = '#7c3aed'

const mapElement = ref(null)
let map = null

onMounted(() => {
  map = L.map(mapElement.value).setView(SINGAPORE, 12)
  L.tileLayer(ONEMAP_TILES, { minZoom: 11, maxZoom: 19, attribution: ONEMAP_CREDIT }).addTo(map)

  const points = []

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

  for (const start of props.starts) {
    if (typeof start.lat !== 'number' || typeof start.lng !== 'number') {
      continue
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
  height: 360px;
  width: 100%;
  border-radius: var(--bs-border-radius);
}
</style>
