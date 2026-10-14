<!--
  PITCH PLACEHOLDER (demo/pitch branch only; never merge into integration or main). JS replaces this.
  Shows the placeholder ranking from GET /api/ranking/:code with S's MapView and VenueList.
  ROUTE: /meetup/:code/results
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import MeetingPointCard from '../components/MeetingPointCard.vue'
import MapView from '../components/MapView.vue'
import VenueList from '../components/VenueList.vue'
import VotePanel from '../components/VotePanel.vue'

const route = useRoute()
const router = useRouter()
const code = route.params.code

const meetup = ref(null)
const ranking = ref([])
const selectedId = ref('')
const myMemberId = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

async function loadResults() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const meetupResponse = await axios.get(`${BASE_URL}/meetups/${code}`)
    meetup.value = meetupResponse.data
    const rankingResponse = await axios.get(`${BASE_URL}/ranking/${code}`)
    ranking.value = rankingResponse.data
    if (ranking.value.length > 0) {
      selectedId.value = ranking.value[0].stationId
    }
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage.value = error.response.data.error
    } else {
      errorMessage.value = 'Could not load the results. Please try again.'
    }
  }
  isLoading.value = false
}

onMounted(() => {
  myMemberId.value = localStorage.getItem(`fairspot-member-${code}`)
  loadResults()
})

const starts = computed(() => {
  const list = []
  if (!meetup.value) return list
  for (const member of meetup.value.members) {
    if (member.start) {
      list.push({ name: member.name, lat: member.start.lat, lng: member.start.lng })
    }
  }
  return list
})

const selected = computed(() => {
  for (const point of ranking.value) {
    if (point.stationId === selectedId.value) return point
  }
  return null
})

const voteOptions = computed(() => ranking.value.slice(0, 3))

const isHost = computed(() => {
  if (!meetup.value || meetup.value.members.length === 0) return false
  return meetup.value.members[0]._id === myMemberId.value
})

function confirmChoice(stationId) {
  router.push({ name: 'meetup-summary', params: { code }, query: { station: stationId } })
}
</script>

<template>
  <section data-testid="meetup-results-page">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h3 mb-0">Fair meeting points</h1>
      <RouterLink :to="`/meetup/${code}`" class="btn btn-outline-secondary btn-sm">Back to lobby</RouterLink>
    </div>

    <div v-if="isLoading" class="text-center my-5" data-testid="results-loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Ranking meeting points…</span>
      </div>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="results-error">
      {{ errorMessage }}
    </div>

    <div v-else class="row g-4">
      <div class="col-lg-5">
        <div class="alert alert-warning py-2 small" data-testid="results-sample-note">
          Sample travel times currently. Rankings logic is still a work in progress.
        </div>
        <p class="small text-muted mb-2">Fairest first: the shortest <em>longest</em> journey wins.</p>
        <div class="list-group mb-4" data-testid="results-list">
          <MeetingPointCard
            v-for="(point, index) in ranking"
            :key="point.stationId"
            :point="point"
            :rank="index + 1"
            :selected="point.stationId === selectedId"
            @select="selectedId = $event"
          />
        </div>
        <VotePanel :options="voteOptions" :is-host="isHost" @confirm="confirmChoice" />
      </div>

      <div class="col-lg-7">
        <MapView
          :key="selectedId"
          :starts="starts"
          :candidates="ranking"
          :selected-id="selectedId"
          @select="selectedId = $event"
        />
        <div v-if="selected" class="mt-4">
          <h2 class="h5 mb-3">Places near {{ selected.name }}</h2>
          <VenueList :key="selectedId" :lat="selected.lat" :lng="selected.lng" />
        </div>
      </div>
    </div>
  </section>
</template>
