<!--
  FILE:     src/views/LiveMapView.vue
  OWNER:    S (team-written)
  PURPOSE:  Live map for the meetup day: members who agree share where they are, everyone sees
            each other's live trip time to the meeting point, and you can show your own route
  ROUTE:    /meetup/:code/live
  TALKS TO: GET, PUT and DELETE /api/live/:code (all need a login)
            the browser's Geolocation API (navigator.geolocation)
  POLLING:  everyone's positions refresh every 5 seconds while this page is open (decided: no
            WebSockets); your own position is sent at most every 15 seconds
  PRIVACY:  you must be logged in, and a member who joined with your account: guests can't use
            this page. Nothing is shared until you press "Share my location", and then the
            browser asks too. Sharing only works from 1 hour before the meetup to 30 minutes after
            it starts. Stop, or leaving this page by a link, deletes your location. Closing the
            tab or reloading only stops sending it: your dot turns grey, and when you come back
            the page offers to remove it. It's hidden once the live map closes, and MongoDB
            deletes it within 2 hours (TTL index in models/location-model.js).
  REVISE:   Wk 5 onMounted + Axios, computed · Wk 6 props · Wk 11 router params
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { formatTime } from '../utils/meetup-date'
import { describeStep } from '../utils/route-steps'
import { isStale } from '../utils/live-time'
import LiveMap from '../components/LiveMap.vue'
import LiveEtaList from '../components/LiveEtaList.vue'

const LIVE_REFRESH_MS = 5000 // fetch everyone's positions every 5 seconds
const SEND_EVERY_MS = 15000 // send yours at most every 15 seconds
// enableHighAccuracy uses GPS on a phone; maximumAge lets the phone reuse a 10-second-old fix
const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }

const route = useRoute()
const auth = useAuthStore()
const code = route.params.code

const live = ref(null) // the latest GET /api/live answer
const isLoading = ref(true)
const isNotMember = ref(false) // logged in, but this account hasn't joined the meetup
const errorMessage = ref('') // the page couldn't load at all
const isOffline = ref(false) // the last refresh failed; the map stays up
const message = ref('') // a sharing problem; the rest of the page still works
// 'off' → 'starting' (waiting for the phone) → 'on' → 'stopping' (deleting) → 'off'
const shareState = ref('off')
const myPosition = ref(null) // { lat, lng, accuracyM }, straight from the phone
const myRoute = ref([]) // your trip from where you are (steps from the server)
const showRoute = ref(false)
const consentDismissed = ref(false)
const now = ref(Date.now())

let refreshTimer = null
let watchId = null // from watchPosition, needed to stop it
let lastSentAt = 0
let sending = null // the send in progress, so Stop can wait for it before deleting
let isUnmounted = false // you left the page while the first load was still running

// The server works out which member you are from this login
function authConfig() {
  return { headers: { Authorization: `Bearer ${auth.token}` } }
}

function errorText(error, fallback) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error
  }
  return fallback
}

// Loads the live map. An expired login (401) asks you to log in, and not being a member (403)
// asks you to join. A failed first load shows errorMessage; a failed refresh only sets isOffline.
// If the window closes while you're sharing, sharing stops.
async function loadLive() {
  try {
    const response = await axios.get(`${BASE_URL}/live/${code}`, authConfig())
    live.value = response.data
    isOffline.value = false
    if (shareState.value === 'on') myRoute.value = response.data.myRoute
    if (!response.data.window.isOpen) stopSharing() // does nothing if you aren't sharing
  } catch (error) {
    const status = error.response ? error.response.status : null
    if (status === 401 || status === 403) {
      clearInterval(refreshTimer)
      stopSharing() // does nothing if you aren't sharing
      if (status === 401) auth.clearSession()
      else isNotMember.value = true
    } else if (live.value) {
      isOffline.value = true
    } else {
      errorMessage.value = errorText(error, 'Could not load the live map. Please try again.')
    }
  }
  isLoading.value = false
}

// When you aren't logged in the page asks you to (nothing to load). Otherwise it loads, then
// refreshes every LIVE_REFRESH_MS. Each refresh also re-sends your position when it's due,
// because a phone standing still doesn't report new positions. A phone pauses timers while its
// screen is off, so the page refreshes as soon as you come back.
function refresh() {
  now.value = Date.now()
  loadLive()
  if (shareState.value === 'on') sendIfDue()
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') refresh()
}

onMounted(async () => {
  if (!auth.isLoggedIn) {
    isLoading.value = false
    return
  }
  await loadLive()
  // Left the page during the first load: starting the timer now would leave it running forever
  if (isUnmounted || errorMessage.value || isNotMember.value || !auth.isLoggedIn) return
  refreshTimer = setInterval(refresh, LIVE_REFRESH_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

// Only ever called from a button the user pressed. Without https (or localhost) or the
// Geolocation API it shows a message. watchPosition is the browser's Geolocation API, not Vue's
// watch: the browser asks for permission, then calls onPosition each time the phone moves, until
// clearWatch.
function startSharing() {
  message.value = ''
  if (!window.isSecureContext) {
    message.value = 'Location only works on a secure page (https://, or localhost on a laptop).'
    return
  }
  if (!('geolocation' in navigator)) {
    message.value = "This browser can't share its location."
    return
  }
  consentDismissed.value = true
  shareState.value = 'starting'
  watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, GEO_OPTIONS)
}

// Shows your dot straight away, then sends it if it's due
function onPosition(position) {
  // Stopped while the phone was still finding you
  if (shareState.value !== 'starting' && shareState.value !== 'on') return
  const { latitude, longitude, accuracy } = position.coords
  myPosition.value = { lat: latitude, lng: longitude, accuracyM: accuracy }
  shareState.value = 'on'
  sendIfDue()
}

function sendIfDue() {
  if (sending || !myPosition.value) return
  if (Date.now() - lastSentAt >= SEND_EVERY_MS) sending = sendLocation()
}

// Sends your position; the answer has your trip from here
async function sendLocation() {
  lastSentAt = Date.now()
  try {
    const response = await axios.put(`${BASE_URL}/live/${code}`, myPosition.value, authConfig())
    if (shareState.value === 'on') myRoute.value = response.data.steps
    message.value = ''
  } catch (error) {
    message.value = errorText(error, "Couldn't send your location. Trying again soon.")
  }
  sending = null
}

// Permission denied stops sharing and says how to allow it; any other error is only shown,
// because the browser keeps trying by itself
function onPositionError(error) {
  if (error.code === error.PERMISSION_DENIED) {
    stopSharing()
    message.value =
      'Location is blocked for this site. Allow it in your browser settings, then press Share again.'
    return
  }
  message.value = "Can't find your location right now. Keep this page open; it will keep trying."
}

// Deletes your location so nobody sees it any more, then refreshes so your row goes straight
// away (unless you've left the page or logged out)
async function removeLocation(config = authConfig()) {
  try {
    await axios.delete(`${BASE_URL}/live/${code}`, config)
  } catch (error) {
    message.value = errorText(
      error,
      "Couldn't reach the server, so your last location may show until the live map closes.",
    )
  }
  if (!isUnmounted && auth.isLoggedIn) await loadLive()
}

// You pressed "Remove my location" after coming back: don't ask you to share straight after that
function removeLeftBehind() {
  consentDismissed.value = true
  removeLocation()
}

// Stops the phone, clears your dot and route, waits for a send in progress, then removes your
// location. While it's 'stopping' the button is disabled, so a quick Share can't be wiped out by
// this DELETE. It stays 'stopping' until the refresh is back, so the page never thinks you were
// left on the map.
async function stopSharing() {
  if (shareState.value === 'off' || shareState.value === 'stopping') return
  const config = authConfig() // read it now: logging out clears the token while this waits
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  shareState.value = 'stopping'
  myPosition.value = null
  myRoute.value = []
  showRoute.value = false
  if (sending) await sending // sendLocation handles its own errors
  await removeLocation(config)
  shareState.value = 'off'
}

function toggleSharing() {
  if (shareState.value === 'off') startSharing()
  else stopSharing()
}

const liveWindow = computed(() => (live.value ? live.value.window : null))

const myMemberId = computed(() => (live.value ? live.value.myMemberId : ''))

const people = computed(() => {
  if (!live.value) return []
  return live.value.people.map((person) => ({
    ...person,
    isStale: isStale(person.updatedAt, now.value),
  }))
})

const myTrip = computed(() => people.value.find((person) => person.memberId === myMemberId.value))

const myRouteSteps = computed(() =>
  myRoute.value.map((step) => describeStep(step, live.value.destination.name)),
)

const directionsUrl = computed(() => {
  const { lat, lng } = live.value.destination
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`
})

const shareButtonText = computed(() => {
  if (shareState.value === 'starting') return 'Finding you… Cancel'
  if (shareState.value === 'on') return 'Stop sharing'
  if (shareState.value === 'stopping') return 'Stopping…'
  return 'Share my location'
})

// The server still has your location but this page isn't sending it: you reloaded, or closed the
// tab earlier. The others can still see you, so say so instead of asking you to start sharing.
const isLeftBehind = computed(() => shareState.value === 'off' && myTrip.value !== undefined)

const showConsent = computed(
  () =>
    liveWindow.value.isOpen &&
    shareState.value === 'off' &&
    !consentDismissed.value &&
    !isLeftBehind.value,
)

// Stops refreshing. Leaving the page stops sharing too (privacy).
onUnmounted(() => {
  isUnmounted = true
  clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  stopSharing() // does nothing if you aren't sharing
})
</script>

<template>
  <section class="live-page" data-testid="live-page">
    <header class="app-page-header d-flex flex-wrap justify-content-between align-items-end gap-3">
      <div>
        <h1 class="app-heading mb-1">Live map</h1>
        <p v-if="live" class="mb-0" data-testid="live-subtitle">
          To {{ live.destination.name }} · live from {{ formatTime(liveWindow.opensTime) }} to
          {{ formatTime(liveWindow.closesTime) }}
        </p>
      </div>
      <RouterLink
        :to="`/meetup/${code}/summary`"
        class="app-btn btn-quiet app-btn-sm"
        data-testid="live-back"
        >Back to summary</RouterLink
      >
    </header>

    <div v-if="!auth.isLoggedIn" class="alert alert-secondary" data-testid="live-login">
      The live map shows where people are, so it needs an account.
      <RouterLink to="/login">Log in</RouterLink> to see it. If you joined as a guest, log in and
      join again with the meetup code.
    </div>

    <div v-else-if="isLoading" class="text-center my-5" data-testid="live-loading">
      <div class="spinner-border text-sign" role="status">
        <span class="visually-hidden">Loading the live map…</span>
      </div>
    </div>

    <div v-else-if="isNotMember" class="alert alert-secondary" data-testid="live-not-member">
      Only members who joined with their account can see the live map.
      <RouterLink to="/join">Join with the meetup code</RouterLink> while logged in.
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="live-error">
      {{ errorMessage }}
    </div>

    <template v-else-if="live">
      <p
        v-if="!liveWindow.isOpen && !liveWindow.hasEnded"
        class="alert alert-info"
        data-testid="live-not-yet"
      >
        The live map opens at <strong>{{ formatTime(liveWindow.opensTime) }}</strong
        >, 1 hour before the meetup. Until then, nobody's location is shared.
      </p>
      <p v-else-if="liveWindow.hasEnded" class="alert alert-secondary" data-testid="live-ended">
        The live map closed at {{ formatTime(liveWindow.closesTime) }}. Nobody's location is shown
        any more, and the last ones are deleted automatically.
      </p>

      <div v-if="showConsent" class="card app-card mb-3" data-testid="live-consent">
        <div class="card-body">
          <h2 class="h5 app-heading mb-2">Share your live location?</h2>
          <ul class="mb-3">
            <li>
              Members of this meetup see where you are and your trip time to
              {{ live.destination.name }}.
            </li>
            <li>
              Only until {{ formatTime(liveWindow.closesTime) }}. After that nobody can see it, and
              it's deleted.
            </li>
            <li>
              Stop any time. If you close this page without pressing Stop, your last location stays
              until you come back and remove it, or the map closes.
            </li>
          </ul>
          <div class="d-flex flex-wrap gap-2">
            <button
              type="button"
              class="app-btn btn-sign"
              data-testid="live-consent-share"
              @click="startSharing"
            >
              Share my location
            </button>
            <button
              type="button"
              class="app-btn btn-quiet"
              data-testid="live-consent-dismiss"
              @click="consentDismissed = true"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLeftBehind" class="card app-card mb-3" data-testid="live-left-behind">
        <div class="card-body">
          <h2 class="h5 app-heading mb-2">You're still on this map</h2>
          <p class="mb-3">
            The others can see your last location from when you shared it. Remove it, or press Share
            to carry on from where you are now.
          </p>
          <button
            type="button"
            class="app-btn btn-sign"
            data-testid="live-remove"
            @click="removeLeftBehind"
          >
            Remove my location
          </button>
        </div>
      </div>

      <p v-if="message" class="alert alert-warning" role="status" data-testid="live-message">
        {{ message }}
      </p>
      <p v-if="isOffline" class="small text-danger" role="status">
        Couldn't refresh the live map. Trying again…
      </p>

      <div class="row g-3">
        <div class="col-lg-8">
          <LiveMap
            :destination="live.destination"
            :people="people"
            :me="myPosition"
            :my-member-id="myMemberId"
            :route-steps="myRoute"
            :show-route="showRoute"
          />
          <p class="small mt-2 mb-0 d-flex flex-wrap justify-content-between gap-2">
            <span>Hover or tap ★ for everyone's trip time.</span>
            <a
              :href="directionsUrl"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="live-directions"
              >Directions in Google Maps</a
            >
          </p>
        </div>

        <div class="col-lg-4">
          <!-- Phones: fixed to the bottom of the screen, in thumb reach.
               Desktop: the top of this column. -->
          <div v-if="liveWindow.isOpen" class="live-actions" data-testid="live-actions">
            <div class="d-flex gap-2">
              <button
                type="button"
                class="app-btn app-btn-lg flex-fill"
                :class="shareState === 'off' ? 'btn-sign' : 'btn-quiet'"
                :disabled="shareState === 'stopping'"
                data-testid="live-share"
                @click="toggleSharing"
              >
                {{ shareButtonText }}
              </button>
              <button
                type="button"
                class="app-btn app-btn-lg flex-fill"
                :class="showRoute ? 'btn-sign' : 'btn-quiet'"
                :disabled="myRoute.length === 0"
                :aria-pressed="showRoute"
                data-testid="live-route"
                @click="showRoute = !showRoute"
              >
                {{ showRoute ? 'Hide route' : 'My route' }}
              </button>
            </div>
            <p v-if="shareState === 'on'" class="live-hint mb-0">
              Keep this page open with your screen on, or your dot stops moving.
            </p>
            <p v-else class="live-hint mb-0">
              Share your location to see your route from where you are.
            </p>
          </div>

          <div
            v-if="showRoute && myRouteSteps.length > 0"
            class="card app-card mt-3"
            data-testid="live-route-steps"
          >
            <div class="card-body">
              <h2 class="h5 app-heading mb-1">Your route from here</h2>
              <p v-if="myTrip && myTrip.etaMinutes !== null" class="mb-2">
                <strong>{{ myTrip.etaMinutes }} min</strong>, arrives
                {{ formatTime(myTrip.arriveAt) }}
              </p>
              <ol class="mb-0 ps-3">
                <li v-for="(step, index) in myRouteSteps" :key="index">
                  <strong>{{ step.label }}</strong> · {{ step.details }} ({{ step.minutes }} min)
                </li>
              </ol>
            </div>
          </div>

          <div v-if="liveWindow.isOpen" class="app-ticket text-start mt-3" data-testid="live-trips">
            <h2 class="app-label mb-3">Live trip times</h2>
            <LiveEtaList :people="people" :my-member-id="myMemberId" :now="now" />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* Room at the bottom so the fixed button bar never covers the last trip time */
.live-page {
  padding-bottom: 130px;
}

/* Phones: a dark bar fixed to the bottom of the screen (above Leaflet's layers), with extra
   padding for the iPhone home bar */
.live-actions {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1030;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background-color: #0a0b0c;
  box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.3);
}

/* Two big buttons side by side still fit on a 320px phone */
.live-actions .app-btn-lg {
  min-height: 52px;
  padding: 10px 12px;
  font-size: 15px;
}

.live-hint {
  margin-top: 8px;
  color: #ffffff;
  font-size: 12.5px;
  text-align: center;
}

/* Desktop: the bar sits at the top of the side column instead */
@media (min-width: 992px) {
  .live-page {
    padding-bottom: 0;
  }

  .live-actions {
    position: static;
    padding: 0;
    background-color: transparent;
    box-shadow: none;
  }

  .live-hint {
    color: inherit;
    text-align: left;
  }
}
</style>
