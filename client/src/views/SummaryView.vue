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
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h3 mb-0">Meetup summary</h1>
      <RouterLink :to="`/meetup/${code}/results`" class="btn btn-outline-secondary btn-sm"
        >Back to results</RouterLink
      >
    </div>

    <div v-if="isLoading" class="text-center my-5" data-testid="summary-loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading summary…</span>
      </div>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="summary-error">
      {{ errorMessage }}
    </div>

    <div v-else-if="meetup && point" class="row g-4">
      <div class="col-lg-5">
        <div class="card app-card mb-4">
          <div class="card-body">
            <span class="badge text-bg-warning mb-2">Sample travel times</span>
            <h2 class="h5 text-primary" data-testid="summary-occasion">{{ meetup.occasion }}</h2>
            <p class="mb-1">
              <strong>Meet at:</strong>
              <span data-testid="summary-point">{{ point.name }} MRT</span>
            </p>
            <p class="mb-1"><strong>Date:</strong> {{ meetup.date }}</p>
            <p class="mb-0"><strong>Time:</strong> {{ meetup.time }}</p>
          </div>
        </div>

        <div class="card app-card mb-4">
          <div class="card-body">
            <h2 class="h6 mb-3">Everyone's journey</h2>
            <ul class="list-group list-group-flush">
              <li
                v-for="j in journeys"
                :key="j.id"
                class="list-group-item px-0"
                data-testid="summary-journey"
              >
                <div class="d-flex justify-content-between">
                  <span class="fw-semibold">{{ j.name }}</span>
                  <span v-if="j.minutes !== null">{{ j.minutes }} min</span>
                </div>
                <div class="small text-muted">from {{ j.from }}</div>
              </li>
            </ul>
          </div>
        </div>

        <BusArrivalCard :stop-code="SAMPLE_STOP.code" :label="SAMPLE_STOP.label" />
      </div>

      <div class="col-lg-7">
        <MapView :starts="starts" :candidates="[point]" :selected-id="point.stationId" />
      </div>
    </div>
  </section>
</template>
