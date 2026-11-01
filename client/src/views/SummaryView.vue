<!--
  PITCH PLACEHOLDER (demo/pitch branch only; never merge into integration or main). I replaces this.
  The meeting point is the one the host confirmed (meetup.finalStation). Travel times come from
  the ranking. The bus-arrival card shows the buses in the viewer's route.
  ROUTE: /meetup/:code/summary
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import { BASE_URL } from '../config'
import { formatDate } from '../utils/meetup-date'
import { tripTone } from '../utils/trip-tone'
import { describeStep } from '../utils/route-steps'
import MapView from '../components/MapView.vue'
import BusArrivalCard from '../components/BusArrivalCard.vue'

const route = useRoute()
const code = route.params.code

const meetup = ref(null)
const ranking = ref([])
const myMemberId = ref(localStorage.getItem(`fairspot-member-${code}`))
const isLoading = ref(true)
const errorMessage = ref('')

async function loadSummary() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const meetupResponse = await axios.get(`${BASE_URL}/meetups/${code}`)
    meetup.value = meetupResponse.data
    if (meetup.value.finalStation) {
      const rankingResponse = await axios.get(`${BASE_URL}/ranking/${code}`)
      ranking.value = rankingResponse.data.ranking
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

onMounted(() => {
  loadSummary()
})

// The confirmed meeting point. If start points changed after the host confirmed it, it may no
// longer be in the ranking, so it is still shown, without travel times.
const point = computed(() => {
  if (!meetup.value || !meetup.value.finalStation) return null
  const { optionId, name, lat, lng } = meetup.value.finalStation
  const ranked = ranking.value.find((p) => p.stationId === optionId)
  return ranked || { stationId: optionId, name, lat, lng, times: [] }
})

const hasTimes = computed(() => point.value !== null && point.value.times.length > 0)

const journeys = computed(() => {
  const list = []
  if (!meetup.value || !point.value) return list
  for (const member of meetup.value.members) {
    let minutes = null
    for (const t of point.value.times) {
      if (t.memberId === member._id) minutes = t.minutes
    }
    list.push({
      id: member._id,
      name: member.name,
      from: member.start ? member.start.label : 'No start point',
      minutes,
    })
  }
  return list
})

// The trip for whoever is viewing this page, or null if they have no route to this point
const myTrip = computed(() => {
  if (!point.value) return null
  return point.value.times.find((t) => t.memberId === myMemberId.value) || null
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
  <section data-testid="summary-page">
    <header class="app-page-header d-flex flex-wrap justify-content-between align-items-end gap-3">
      <h1 class="app-heading mb-0">Meetup summary</h1>
      <RouterLink :to="`/meetup/${code}/results`" class="app-btn btn-quiet app-btn-sm"
        >Back to results</RouterLink
      >
    </header>

    <div v-if="isLoading" class="text-center my-5" data-testid="summary-loading">
      <div class="spinner-border text-sign" role="status">
        <span class="visually-hidden">Loading summary…</span>
      </div>
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
          Travel times aren't available because start points changed after this meeting point was
          confirmed.
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
.summary-place {
  font-size: clamp(34px, 5vw, 46px);
  line-height: 1;
  text-transform: uppercase;
}

.summary-date {
  border-bottom: 2px dashed #3a3d41;
}
</style>
