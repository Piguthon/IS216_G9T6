<!-- The live map: the meeting point, everyone who is sharing, you, and your route. -->
<script setup>
// Map: Leaflet (https://leafletjs.com, BSD-2-Clause)
// Base map tiles: OneMap (https://www.onemap.gov.sg), © contributors | Singapore Land Authority
import { ref, onMounted, onUpdated, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decodePolyline } from '../utils/polyline'
import { formatTime } from '../utils/meetup-date'
import { byTripTime } from '../utils/live-time'

const props = defineProps({
  destination: { type: Object, required: true },
  people: { type: Array, default: () => [] },
  me: { type: Object, default: null },
  myMemberId: { type: String, default: '' },
  routeSteps: { type: Array, default: () => [] },
  showRoute: { type: Boolean, default: false },
})

const ONEMAP_TILES = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'
const ONEMAP_CREDIT =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
const PERSON_COLOUR = '#0f766e'
const ME_COLOUR = '#1d4f91'
const STALE_COLOUR = '#94a3b8'
const WALK_COLOUR = '#64748b'
const BUS_COLOUR = '#0e8560'
const TRAIN_COLOUR = '#1d4f91'
const CAR_COLOUR = '#7c3aed'

const mapElement = ref(null)
let map = null
let destinationMarker = null
let meMarker = null
let routeLayer = null
const markers = {}
let hasFitted = false
let hadMe = false
let hadRoute = false

// Tooltip content as an element, so names typed by users are shown as text, not HTML
function tooltipElement(title, lines) {
  const box = document.createElement('div')
  const heading = document.createElement('strong')
  heading.textContent = title
  box.appendChild(heading)
  for (const line of lines) {
    const row = document.createElement('div')
    row.textContent = line
    box.appendChild(row)
  }
  return box
}

function tripText(person) {
  if (person.etaMinutes === null) return 'No route found'
  return `${person.etaMinutes} min, arrives ${formatTime(person.arriveAt)}`
}

// Creates the map, the route layer and the meeting point marker
onMounted(() => {
  const { lat, lng } = props.destination
  map = L.map(mapElement.value).setView([lat, lng], 14)
  L.tileLayer(ONEMAP_TILES, { minZoom: 11, maxZoom: 19, attribution: ONEMAP_CREDIT }).addTo(map)
  routeLayer = L.featureGroup().addTo(map)

  const star = L.divIcon({ className: 'live-destination', html: '★', iconSize: [36, 36] })
  destinationMarker = L.marker([lat, lng], { icon: star, zIndexOffset: 1000 })
    .bindTooltip('', { direction: 'top', offset: [0, -16] })
    .addTo(map)

  redraw()
})

// Draws a dot for everyone sharing except you, moving existing dots and removing old ones
function drawPeople() {
  const stillSharing = {}
  for (const person of props.people) {
    if (person.memberId === props.myMemberId) continue
    stillSharing[person.memberId] = true

    const style = {
      radius: 9,
      weight: 3,
      color: '#ffffff',
      fillColor: person.isStale ? STALE_COLOUR : PERSON_COLOUR,
      fillOpacity: 1,
      dashArray: person.isStale ? '3 3' : null,
    }
    if (!markers[person.memberId]) {
      markers[person.memberId] = L.circleMarker([person.lat, person.lng], style)
        .bindTooltip('', { direction: 'top' })
        .addTo(map)
    }
    markers[person.memberId]
      .setStyle(style)
      .setTooltipContent(tooltipElement(person.name, [tripText(person)]))
      .setLatLng([person.lat, person.lng])
  }

  for (const memberId of Object.keys(markers)) {
    if (stillSharing[memberId]) continue
    markers[memberId].remove()
    delete markers[memberId]
  }
}

// Your own blue dot, from your phone's position (or none when you're not sharing)
function drawMe() {
  if (!props.me) {
    if (meMarker) meMarker.remove()
    meMarker = null
    return
  }
  const position = [props.me.lat, props.me.lng]
  if (!meMarker) {
    meMarker = L.circleMarker(position, {
      radius: 10,
      weight: 4,
      color: '#ffffff',
      fillColor: ME_COLOUR,
      fillOpacity: 1,
    })
      .bindTooltip('You')
      .addTo(map)
  }
  meMarker.setLatLng(position)
}

// Clears the route layer, then draws each part of your trip if showRoute is on
function drawRoute() {
  routeLayer.clearLayers()
  if (!props.showRoute) return
  for (const step of props.routeSteps) {
    if (!step.points) continue
    const isWalk = step.mode === 'WALK'
    const lineColour = step.mode === 'CAR' ? CAR_COLOUR : TRAIN_COLOUR
    L.polyline(decodePolyline(step.points), {
      color: isWalk ? WALK_COLOUR : step.mode === 'BUS' ? BUS_COLOUR : lineColour,
      weight: isWalk ? 4 : 6,
      opacity: 0.9,
      dashArray: isWalk ? '4 8' : null,
    }).addTo(routeLayer)
  }
}

// The meeting point's tooltip: everyone's live trip time, soonest first
function drawDestinationTooltip() {
  const lines = [...props.people].sort(byTripTime).map((person) => {
    const who = person.memberId === props.myMemberId ? `${person.name} (you)` : person.name
    return `${who}: ${tripText(person)}`
  })
  if (lines.length === 0) lines.push('No one is sharing yet')
  destinationMarker.setTooltipContent(tooltipElement(props.destination.name, lines))
}

// The meeting point and every dot, for fitting the map view
function allPoints() {
  const points = [[props.destination.lat, props.destination.lng]]
  for (const person of props.people) points.push([person.lat, person.lng])
  if (props.me) points.push([props.me.lat, props.me.lng])
  return points
}

function fitAll() {
  const points = allPoints()
  if (points.length < 2) {
    map.setView(points[0], 14)
    return
  }
  map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 })
}

function redraw() {
  drawRoute()
  drawPeople()
  drawMe()
  drawDestinationTooltip()

  const routeTurnedOn = props.showRoute && !hadRoute && routeLayer.getLayers().length > 0
  const meAppeared = props.me !== null && !hadMe
  if (routeTurnedOn) {
    map.fitBounds(routeLayer.getBounds(), { padding: [36, 36] })
  } else if (meAppeared || (!hasFitted && allPoints().length > 1)) {
    fitAll()
    hasFitted = true
  }
  hadRoute = props.showRoute
  hadMe = props.me !== null
}

onUpdated(redraw)

onUnmounted(() => {
  if (map) map.remove()
})
</script>

<template>
  <div class="live-map-wrap">
    <div ref="mapElement" class="live-map" data-testid="live-map"></div>
    <button
      type="button"
      class="app-btn btn-quiet app-btn-sm live-fit"
      data-testid="live-fit"
      @click="fitAll"
    >
      Show everyone
    </button>
  </div>
</template>

<style scoped>
.live-map-wrap {
  position: relative;
}

.live-map {
  width: 100%;
  height: 60vh;
  height: 60dvh;
  min-height: 300px;
}

@media (min-width: 992px) {
  .live-map {
    height: 70vh;
  }
}

.live-fit {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1001;
}

.live-map :deep(.leaflet-tooltip) {
  width: max-content;
  max-width: 260px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.live-map :deep(.live-destination) {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #ffffff;
  border-radius: 50%;
  background-color: #f59e0b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  color: #111111;
  font-size: 20px;
  line-height: 1;
}
</style>
