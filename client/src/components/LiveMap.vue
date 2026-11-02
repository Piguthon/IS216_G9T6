<!--
  FILE:     src/components/LiveMap.vue
  OWNER:    S (team-written)
  PURPOSE:  The live map: the meeting point, everyone who is sharing, you, and your route.
            Dots move in place when new positions arrive, so your zoom and pan are kept.
  PROPS:    destination ({ name, lat, lng })
            people (Array of { memberId, name, lat, lng, etaMinutes, arriveAt, isStale })
            me ({ lat, lng } or null): your position, straight from your phone
            myMemberId (String): your server copy is skipped, because you're drawn from me
            routeSteps (Array of route steps): your trip from where you are
            showRoute (Boolean): draw routeSteps
  EMITS:    none
  TALKS TO: Leaflet (leafletjs.com, BSD-2-Clause) with OneMap base map tiles, as in MapView.vue
  REVISE:   Wk 5 onMounted / onUpdated / onUnmounted · Wk 6 props
  DONE WHEN:
    - [ ] hovering the meeting point (tapping, on a phone) lists everyone's trip time
    - [ ] dots move without the map jumping back
    - [ ] a phone that stopped updating turns grey
    - [ ] your route shows and hides
-->
<script setup>
// Map: Leaflet (https://leafletjs.com, BSD-2-Clause)
// Base map tiles: OneMap (https://www.onemap.gov.sg), © contributors | Singapore Land Authority
import { ref, onMounted, onUpdated, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { decodePolyline } from '../utils/polyline'
import { formatTime } from '../utils/meetup-date'
import { byTripTime } from '../utils/live-time'

// STEPS

// TODO 1: Declare the props from the header.
const props = defineProps({
  destination: { type: Object, required: true },
  people: { type: Array, default: () => [] },
  me: { type: Object, default: null },
  myMemberId: { type: String, default: '' },
  routeSteps: { type: Array, default: () => [] },
  showRoute: { type: Boolean, default: false },
})

// TODO 2: Tiles, credit and colours. Tiles, credit and route colours are the same as MapView.vue.
const ONEMAP_TILES = 'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'
const ONEMAP_CREDIT =
  '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
const PERSON_COLOUR = '#0f766e' // teal: other members
const ME_COLOUR = '#1d4f91' // sign blue: you
const STALE_COLOUR = '#94a3b8' // light grey: no update for 2 minutes
const WALK_COLOUR = '#64748b' // grey dashes: walking
const BUS_COLOUR = '#0e8560' // green: bus
const TRAIN_COLOUR = '#1d4f91' // blue: train

const mapElement = ref(null) // the <div> in the template; Leaflet draws inside it
// Leaflet objects are plain variables, because Vue doesn't need to track them
let map = null
let destinationMarker = null
let meMarker = null
let routeLayer = null // a group holding the route lines, so they can be cleared together
const markers = {} // memberId → that person's dot
let hasFitted = false
let hadMe = false // were you on the map at the last redraw?
let hadRoute = false // was your route showing at the last redraw?

// Tooltip content as an element, not an HTML string. Names are typed by users, and Leaflet
// would treat a string as HTML, so textContent keeps a name like "<img onerror=…>" as text.
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

// TODO 3: onMounted: create the map, the layer for the route, and the meeting point marker.
//         bindTooltip opens on hover, and on tap on a phone (Leaflet opens tooltips on click too).
onMounted(() => {
  const { lat, lng } = props.destination
  map = L.map(mapElement.value).setView([lat, lng], 14)
  L.tileLayer(ONEMAP_TILES, { minZoom: 11, maxZoom: 19, attribution: ONEMAP_CREDIT }).addTo(map)
  routeLayer = L.featureGroup().addTo(map) // a featureGroup can tell us its bounds

  const star = L.divIcon({ className: 'live-destination', html: '★', iconSize: [36, 36] })
  destinationMarker = L.marker([lat, lng], { icon: star, zIndexOffset: 1000 })
    .bindTooltip('', { direction: 'top', offset: [0, -16] })
    .addTo(map)

  redraw()
})

// TODO 4: drawPeople(): a dot for everyone sharing, except you.
//           - an existing dot moves with setLatLng; a new person gets a new dot
//           - someone who stopped sharing loses their dot
//           - a stale dot is grey with a dashed edge
function drawPeople() {
  const stillSharing = {}
  for (const person of props.people) {
    if (person.memberId === props.myMemberId) continue // you're drawn from your phone instead
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
      .setLatLng([person.lat, person.lng])
      .setStyle(style)
      .setTooltipContent(tooltipElement(person.name, [tripText(person)]))
  }

  for (const memberId of Object.keys(markers)) {
    if (stillSharing[memberId]) continue
    markers[memberId].remove()
    delete markers[memberId]
  }
}

// TODO 5: drawMe(): your own blue dot, from your phone's position (or none when not sharing).
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

// TODO 6: drawRoute(): clear the route layer, then draw each part of your trip if showRoute.
function drawRoute() {
  routeLayer.clearLayers()
  if (!props.showRoute) return
  for (const step of props.routeSteps) {
    if (!step.points) continue
    const isWalk = step.mode === 'WALK'
    L.polyline(decodePolyline(step.points), {
      color: isWalk ? WALK_COLOUR : step.mode === 'BUS' ? BUS_COLOUR : TRAIN_COLOUR,
      weight: isWalk ? 4 : 6,
      opacity: 0.9,
      dashArray: isWalk ? '4 8' : null,
    }).addTo(routeLayer)
  }
}

// TODO 7: The meeting point's tooltip: everyone's live trip time, soonest first.
function drawDestinationTooltip() {
  const lines = [...props.people].sort(byTripTime).map((person) => {
    const who = person.memberId === props.myMemberId ? `${person.name} (you)` : person.name
    return `${who}: ${tripText(person)}`
  })
  if (lines.length === 0) lines.push('No one is sharing yet')
  destinationMarker.setTooltipContent(tooltipElement(props.destination.name, lines))
}

// TODO 8: Zooming. fitAll() shows the meeting point and every dot. It runs by itself only when
//         something new happens: the first time there's someone to show, and when you start
//         sharing. Turning on your route zooms to the route. Otherwise only the "Show everyone"
//         button runs it, so a refresh never undoes your own zooming.
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

// TODO 9: onUpdated: the parent passes new props after every refresh, which re-renders this
//         component, so redraw then. (The team doesn't use watch; onUpdated is the lifecycle
//         hook that runs after each re-render.)
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

/* Tall enough to read on a phone, short enough to scroll past to the trip times.
   dvh follows the phone's browser bars; vh is the fallback for older browsers. */
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

/* Above Leaflet's panes (400) and controls (1000); top right, clear of the zoom buttons */
.live-fit {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1001;
}

/* Leaflet adds tooltips and the star outside Vue's template, so :deep reaches them.
   Tooltips wrap instead of running off the side of a phone screen. */
.live-map :deep(.leaflet-tooltip) {
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
