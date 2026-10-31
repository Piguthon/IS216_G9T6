<!--
  PITCH PLACEHOLDER (demo/pitch branch only; never merge into integration or main). I replaces this.
  The confirmed point comes from ?station= (set by the vote panel). Travel times are the
  placeholder ranking's. The bus-arrival card uses one fixed sample stop.
  ROUTE: /meetup/:code/summary
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import { BASE_URL } from '../config'
import { tripTone } from '../utils/trip-tone'
import MapView from '../components/MapView.vue'
import BusArrivalCard from '../components/BusArrivalCard.vue'

const route = useRoute()
const code = route.params.code
const stationId = route.query.station

const SAMPLE_STOP = { code: '01059', label: 'Bugis Stn Exit B (sample stop)' }

const meetup = ref(null)
const ranking = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

async function loadSummary() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const meetupResponse = await axios.get(`${BASE_URL}/meetups/${code}`)
    meetup.value = meetupResponse.data
    const rankingResponse = await axios.get(`${BASE_URL}/ranking/${code}`)
    ranking.value = rankingResponse.data
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

const point = computed(() => {
  for (const p of ranking.value) {
    if (p.stationId === stationId) return p
  }
  return ranking.value.length > 0 ? ranking.value[0] : null
})

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

    <div v-else-if="meetup && point" class="row g-4">
      <div class="col-lg-5">
        <div class="app-ticket text-start mb-3">
          <h2 class="app-label mb-2" data-testid="summary-occasion">{{ meetup.occasion }}</h2>
          <p class="summary-place app-doto app-text-bright mb-3" data-testid="summary-point">
            {{ point.type === 'interchange' ? point.name : `${point.name} MRT` }}
          </p>
          <p class="summary-date pb-3 mb-3">{{ meetup.date }}, {{ meetup.time }}</p>
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
        <BusArrivalCard :stop-code="SAMPLE_STOP.code" :label="SAMPLE_STOP.label" />
      </div>

      <div class="col-lg-7">
        <MapView :starts="starts" :candidates="[point]" :selected-id="point.stationId" />
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
