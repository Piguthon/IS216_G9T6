<!--
  FILE:     src/views/SummaryView.vue
  OWNER:    I (team-written)
  PURPOSE:  The meetup summary once the host has confirmed the meeting point
            (meetup.finalStation): everyone's journey time and when to leave to arrive by the
            meetup time, your own route step by step, live arrivals for the buses in your route,
            and a map of the start points, the meeting point and your route
  ROUTE:    /meetup/:code/summary
  TALKS TO: GET /api/meetups/:code, GET /api/ranking/:code/leave-times
            both send who I am (utils/member-auth.js), so members get start points' lat/lng
            and their trip's route; uses BusArrivalCard and MapView
  POLLING:  the meetup refreshes every 5 seconds while this page is open (decided: no
            WebSockets). Leave times use OneMap, so they only reload when the meeting point, a
            start point or a travel mode changes
  DATA:     Meetup { code, occasion, date, time, finalStation { optionId, name, lat, lng } | null,
                     members: [ { _id, name, start, travelMode } ] }
            leave-times → { trips: [ { memberId, name, travelMode, minutes, waitMinutes, leaveAt,
                                       arriveAt, steps (members only) } ] }
  REVISE:   Wk 4 route params · Wk 5 onMounted + Axios GET, computed · Wk 6 props, components
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { memberAuthConfig } from '../utils/member-auth'
import { formatDate, formatTime } from '../utils/meetup-date'
import { tripTone } from '../utils/trip-tone'
import { describeStep } from '../utils/route-steps'
import MapView from '../components/MapView.vue'
import BusArrivalCard from '../components/BusArrivalCard.vue'
import PlatformScene from '../components/PlatformScene.vue'

const SUMMARY_REFRESH_MS = 5000

const route = useRoute()
const code = route.params.code
const auth = useAuthStore()

const meetup = ref(null)
const trips = ref([])
const myMemberId = ref(localStorage.getItem(`fairspot-member-${code}`))
const isLoading = ref(true)
const errorMessage = ref('')
let refreshTimer = null

async function loadTrips() {
  // As a member, each trip comes with its route and first bus stop (the server leaves them
  // out for anyone who only knows the code, because they start at home)
  const leaveTimesResponse = await axios.get(
    `${BASE_URL}/ranking/${code}/leave-times`,
    memberAuthConfig(code, auth.token),
  )
  trips.value = leaveTimesResponse.data.trips
}

async function loadSummary() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    // As a member, the start points come with lat/lng, so the map can show them
    const meetupResponse = await axios.get(
      `${BASE_URL}/meetups/${code}`,
      memberAuthConfig(code, auth.token),
    )
    meetup.value = meetupResponse.data
    if (meetup.value.finalStation) {
      await loadTrips()
    }
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage.value = error.response.data.error
    } else {
      errorMessage.value = 'Could not load the summary. Please try again.'
    }
  }
  isLoading.value = false
}

// The trips depend on these, so they only need reloading when this text changes
function tripInputs(data) {
  const members = data.members.map((member) => [member.start, member.travelMode])
  return JSON.stringify([data.finalStation, members])
}

// The timer's quiet version of loadSummary: no spinner, and a failed refresh keeps the last
// summary; the next one tries again.
async function refreshSummary() {
  if (isLoading.value || !meetup.value) return
  try {
    const response = await axios.get(
      `${BASE_URL}/meetups/${code}`,
      memberAuthConfig(code, auth.token),
    )
    const hasNewTrips = tripInputs(response.data) !== tripInputs(meetup.value)
    meetup.value = response.data
    if (hasNewTrips && response.data.finalStation) await loadTrips()
  } catch {
    // keep showing the last summary
  }
}

onMounted(() => {
  loadSummary()
  refreshTimer = setInterval(refreshSummary, SUMMARY_REFRESH_MS)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})

// The confirmed meeting point, with everyone's trip to it
const point = computed(() => {
  if (!meetup.value || !meetup.value.finalStation) return null
  const { optionId, name, lat, lng } = meetup.value.finalStation
  return { stationId: optionId, name, lat, lng, times: trips.value }
})

const hasTimes = computed(() => point.value !== null && point.value.times.length > 0)

const journeys = computed(() => {
  const list = []
  if (!meetup.value || !point.value) return list
  for (const member of meetup.value.members) {
    let minutes = null
    let leaveAt = null
    for (const t of point.value.times) {
      if (t.memberId === member._id) {
        minutes = t.minutes
        leaveAt = t.leaveAt
      }
    }
    list.push({
      id: member._id,
      name: member.name,
      from: member.start ? member.start.label : 'No start point',
      isDriving: member.travelMode === 'car',
      minutes,
      leaveAt,
    })
  }
  return list
})

// The trip for whoever is viewing this page, or null if they have no route to this point.
// Its steps only come to members (a browser whose member link has gone gets the trip without).
const myTrip = computed(() => {
  if (!point.value) return null
  const trip = point.value.times.find((t) => t.memberId === myMemberId.value)
  return trip && trip.steps ? trip : null
})

const isMember = computed(() => {
  if (!meetup.value) return false
  return meetup.value.members.some((member) => member._id === myMemberId.value)
})

const myRoute = computed(() => {
  if (!myTrip.value) return []
  return myTrip.value.steps.map((step) => describeStep(step, point.value.name))
})

// Each bus in my route, at the stop where I board it
const myBuses = computed(() => {
  if (!myTrip.value) return []
  return myTrip.value.steps
    .filter((step) => step.mode === 'BUS' && step.fromCode)
    .map((step) => ({ stopCode: step.fromCode, stopName: step.from, serviceNo: step.route }))
})

// The board colours and scales the bars against the trips we have times for
const knownMinutes = computed(() =>
  journeys.value.filter((j) => j.minutes !== null).map((j) => j.minutes),
)
const longest = computed(() => Math.max(...knownMinutes.value))
const shortest = computed(() => Math.min(...knownMinutes.value))

const starts = computed(() => {
  const list = []
  if (!meetup.value) return list
  for (const member of meetup.value.members) {
    if (member.start) list.push({ name: member.name, lat: member.start.lat, lng: member.start.lng })
  }
  return list
})
</script>

<template>
  <section class="flex-grow-1 d-flex flex-column" data-testid="summary-page">
    <header class="app-page-header d-flex flex-wrap justify-content-between align-items-end gap-3">
      <h1 class="app-heading mb-0">Meetup summary</h1>
      <div class="d-flex flex-wrap gap-2">
        <RouterLink
          v-if="point"
          :to="{ name: 'meetup-live', params: { code } }"
          class="app-btn btn-sign app-btn-sm"
          data-testid="summary-live-link"
          >Live map</RouterLink
        >
        <RouterLink :to="`/meetup/${code}/results`" class="app-btn btn-quiet app-btn-sm"
          >Back to results</RouterLink
        >
      </div>
    </header>

    <!-- While loading, a train passes along the bottom of the page. It goes once the summary arrives. -->
    <div v-if="isLoading" class="flex-grow-1 d-flex flex-column" data-testid="summary-loading">
      <div class="text-center my-5">
        <div class="spinner-border text-sign" role="status">
          <span class="visually-hidden">Loading summary…</span>
        </div>
      </div>
      <PlatformScene class="loading-platform mt-auto" />
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="summary-error">
      {{ errorMessage }}
    </div>

    <div
      v-else-if="meetup && !point"
      class="alert alert-secondary"
      data-testid="summary-unconfirmed"
    >
      The host hasn't confirmed a meeting point yet.
      <RouterLink :to="`/meetup/${code}/results`">See the fair meeting points</RouterLink>.
    </div>

    <div v-else-if="meetup && point" class="row g-4">
      <div class="col-lg-5">
        <div class="app-ticket text-start mb-3">
          <h2 class="app-label mb-2" data-testid="summary-occasion">{{ meetup.occasion }}</h2>
          <p class="summary-place app-doto app-text-bright mb-3" data-testid="summary-point">
            {{ point.name.includes('Interchange') ? point.name : `${point.name} MRT` }}
          </p>
          <p class="summary-date pb-3 mb-3">{{ formatDate(meetup.date) }}, {{ meetup.time }}</p>
          <h3 class="app-label mb-3">Everyone's journey</h3>
          <ul class="trips">
            <li
              v-for="j in journeys"
              :key="j.id"
              class="trip"
              :class="j.minutes !== null ? tripTone(j.minutes, longest, shortest) : ''"
              data-testid="summary-journey"
            >
              <div class="trip-who">
                <strong>{{ j.name }}</strong>
                <span>from {{ j.from }}</span>
                <span v-if="j.isDriving" data-testid="summary-journey-car">by car</span>
                <span v-if="j.leaveAt" data-testid="summary-journey-leave"
                  >leave by {{ formatTime(j.leaveAt) }}</span
                >
              </div>
              <div class="trip-track" aria-hidden="true">
                <div
                  v-if="j.minutes !== null"
                  class="trip-fill"
                  :style="{ width: (j.minutes / longest) * 100 + '%' }"
                ></div>
              </div>
              <span v-if="j.minutes !== null" class="trip-mins"
                >{{ j.minutes }}<small>min</small></span
              >
            </li>
          </ul>
        </div>
        <div v-if="myTrip" class="card app-card" data-testid="summary-route">
          <div class="card-body">
            <h2 class="h4 app-heading mb-1">Your route</h2>
            <p class="mb-1" data-testid="summary-leave-by">
              <strong>Leave by {{ formatTime(myTrip.leaveAt) }}</strong> to arrive at
              {{ formatTime(myTrip.arriveAt) }}
            </p>
            <p class="mb-3" data-testid="summary-route-total">
              <strong>Total {{ myTrip.minutes }} min</strong
              ><span v-if="myTrip.waitMinutes > 0"
                >, including {{ myTrip.waitMinutes }} min waiting for buses and trains</span
              >
            </p>
            <div class="table-responsive">
              <table class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Step</th>
                    <th scope="col">Details</th>
                    <th scope="col" class="text-end">Min</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(step, index) in myRoute"
                    :key="index"
                    data-testid="summary-route-step"
                  >
                    <td class="fw-bold">{{ step.label }}</td>
                    <td>{{ step.details }}</td>
                    <td class="text-end">{{ step.minutes }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <p v-else-if="!hasTimes" class="alert alert-secondary mb-0" data-testid="summary-no-times">
          Travel times aren't available for this meeting point right now.
        </p>
        <p v-else-if="isMember" class="alert alert-secondary mb-0" data-testid="summary-no-route">
          Add your start point in the
          <RouterLink :to="`/meetup/${code}`">meetup lobby</RouterLink> to see your route.
        </p>
      </div>

      <div class="col-lg-7">
        <MapView
          :starts="starts"
          :candidates="[point]"
          :selected-id="point.stationId"
          :route-steps="myTrip ? myTrip.steps : []"
        />
        <BusArrivalCard v-if="myBuses.length > 0" class="mt-3" :buses="myBuses" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The loading train runs the full width of the screen and sits on the footer
   (-44px cancels the bottom padding of .page-body) */
.loading-platform {
  margin-inline: calc(50% - 50vw);
  margin-bottom: -44px;
}

.summary-place {
  font-size: clamp(34px, 5vw, 46px);
  line-height: 1;
  text-transform: uppercase;
}

.summary-date {
  border-bottom: 2px dashed #3a3d41;
}
</style>
