<!--
  FILE:     src/views/MeetupResultsView.vue
  OWNER:    JS (team-written)
  PURPOSE:  The fairest meeting points for a meetup, and group voting: members vote on the
            shortlisted meeting points, then on venues near the confirmed one; the host confirms
            each final choice
  ROUTE:    /meetup/:code/results
  TALKS TO: GET /api/meetups/:code, GET /api/ranking/:code,
            GET/PUT /api/votes/:code, POST /api/votes/:code/confirm (host, logged in)
  POLLING:  vote tallies refresh every 5 seconds while this page is open (decided: no WebSockets)
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import MeetingPointCard from '../components/MeetingPointCard.vue'
import MapView from '../components/MapView.vue'
import VenueList from '../components/VenueList.vue'
import VotePanel from '../components/VotePanel.vue'

const VOTE_REFRESH_MS = 5000
const SHORTLIST_SIZE = 3

const route = useRoute()
const auth = useAuthStore()
const code = route.params.code

const meetup = ref(null)
const ranking = ref([])
const selectedId = ref('')
const myMemberId = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

const votes = ref(null)
const voteError = ref('')
const isVoting = ref(false)
let voteTimer = null

function errorText(error, fallback) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error
  }
  return fallback
}

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
    errorMessage.value = errorText(error, 'Could not load the results. Please try again.')
  }
  isLoading.value = false
}

async function loadVotes() {
  try {
    const response = await axios.get(`${BASE_URL}/votes/${code}`, {
      params: { memberId: myMemberId.value || undefined },
    })
    applyVotes(response.data)
  } catch {
    // keep showing the last tallies; the next refresh tries again
  }
}

// Every vote response carries the confirmed choices too, so all members follow the host
function applyVotes(data) {
  const before = votes.value ? votes.value.final.station : null
  votes.value = data
  const station = data.final.station
  if (station && (!before || before.optionId !== station.optionId)) {
    selectedId.value = station.optionId
  }
}

onMounted(async () => {
  myMemberId.value = localStorage.getItem(`fairspot-member-${code}`)
  await loadResults()
  if (!errorMessage.value) {
    await loadVotes()
    voteTimer = setInterval(loadVotes, VOTE_REFRESH_MS)
  }
})

onUnmounted(() => {
  clearInterval(voteTimer)
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

// Same bar scale on every card, so a longer bar always means a longer trip
const scaleMinutes = computed(() => Math.max(0, ...ranking.value.map((p) => p.longestMinutes)))

const isMember = computed(() => {
  if (!meetup.value || !myMemberId.value) return false
  return meetup.value.members.some((member) => member._id === myMemberId.value)
})

const isHost = computed(() => {
  if (!meetup.value || meetup.value.members.length === 0) return false
  return meetup.value.members[0]._id === myMemberId.value && auth.isLoggedIn
})

const finalStation = computed(() => (votes.value ? votes.value.final.station : null))
const finalVenue = computed(() => (votes.value ? votes.value.final.venue : null))

function countFor(kind, optionId) {
  if (!votes.value) return 0
  const tally = votes.value[kind].tallies.find((t) => t.optionId === optionId)
  return tally ? tally.count : 0
}

// The fairest few, plus any other station someone already voted for
const stationOptions = computed(() => {
  const options = ranking.value.slice(0, SHORTLIST_SIZE).map((point) => ({
    optionId: point.stationId,
    name: point.name,
    lat: point.lat,
    lng: point.lng,
    count: countFor('station', point.stationId),
  }))
  if (votes.value) {
    for (const tally of votes.value.station.tallies) {
      if (!options.some((o) => o.optionId === tally.optionId)) options.push({ ...tally })
    }
  }
  return options
})

// Venues are shortlisted by voting for them from the venue cards
const venueOptions = computed(() => (votes.value ? votes.value.venue.tallies : []))

async function castVote(kind, option) {
  isVoting.value = true
  voteError.value = ''
  try {
    const response = await axios.put(`${BASE_URL}/votes/${code}`, {
      memberId: myMemberId.value,
      kind,
      optionId: option.optionId,
      optionName: option.name,
      lat: option.lat,
      lng: option.lng,
      address: option.address,
    })
    applyVotes(response.data)
  } catch (error) {
    voteError.value = errorText(error, 'Your vote was not saved. Please try again.')
    loadVotes()
  }
  isVoting.value = false
}

function voteForVenue(venue) {
  castVote('venue', {
    optionId: venue.venueKey,
    name: venue.name,
    lat: venue.lat,
    lng: venue.lng,
    address: venue.address,
  })
}

async function confirmChoice(kind, option) {
  isVoting.value = true
  voteError.value = ''
  try {
    const body = option
      ? {
          kind,
          optionId: option.optionId,
          name: option.name,
          lat: option.lat,
          lng: option.lng,
          address: option.address,
        }
      : { kind, optionId: null }
    const response = await axios.post(`${BASE_URL}/votes/${code}/confirm`, body, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    applyVotes(response.data)
  } catch (error) {
    voteError.value = errorText(error, 'The choice was not confirmed. Please try again.')
  }
  isVoting.value = false
}

const venuePoint = computed(() => finalStation.value || selected.value)
</script>

<template>
  <section data-testid="meetup-results-page">
    <header class="app-page-header d-flex flex-wrap justify-content-between align-items-end gap-3">
      <h1 class="display-5 app-heading mb-0">Fair meeting points</h1>
      <RouterLink :to="`/meetup/${code}`" class="app-btn btn-quiet app-btn-sm"
        >Back to lobby</RouterLink
      >
      <p class="w-100 text-muted mb-0">
        Ranked by the longest trip in your group, using OneMap public-transport times. The fairest
        spot is first.
      </p>
    </header>

    <div v-if="isLoading" class="text-center my-5" data-testid="results-loading">
      <div class="spinner-border text-teal" role="status"></div>
      <p class="text-muted mt-3 mb-0" role="status">
        Getting everyone's travel times from OneMap. This can take up to a minute.
      </p>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="results-error">
      {{ errorMessage }}
    </div>

    <div v-else class="row g-4">
      <div class="col-lg-5">
        <div class="list-group mb-4" data-testid="results-list">
          <MeetingPointCard
            v-for="(point, index) in ranking"
            :key="point.stationId"
            :point="point"
            :rank="index + 1"
            :selected="point.stationId === selectedId"
            :confirmed="finalStation !== null && finalStation.optionId === point.stationId"
            :scale-minutes="scaleMinutes"
            @select="selectedId = $event"
          />
        </div>

        <div
          v-if="voteError"
          class="alert alert-danger alert-dismissible"
          role="alert"
          data-testid="vote-error"
        >
          {{ voteError }}
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            @click="voteError = ''"
          ></button>
        </div>
        <p v-if="!isMember" class="alert alert-secondary" data-testid="vote-join-note">
          <RouterLink to="/join">Join this meetup</RouterLink> to vote.
        </p>

        <VotePanel
          class="mb-4"
          title="Vote for a meeting point"
          :options="stationOptions"
          :my-vote="votes ? votes.station.myVote : null"
          :voter-count="meetup ? meetup.members.length : 0"
          :can-vote="isMember"
          :is-host="isHost"
          :final="finalStation"
          :busy="isVoting"
          @vote="castVote('station', $event)"
          @confirm="confirmChoice('station', $event)"
          @reopen="confirmChoice('station', null)"
        />

        <VotePanel
          v-if="finalStation"
          class="mb-4"
          title="Vote for a venue"
          :options="venueOptions"
          :my-vote="votes ? votes.venue.myVote : null"
          :voter-count="meetup ? meetup.members.length : 0"
          :can-vote="isMember"
          :is-host="isHost"
          :final="finalVenue"
          :busy="isVoting"
          empty-text="No venues yet. Vote for a place in the list of places nearby."
          @vote="castVote('venue', $event)"
          @confirm="confirmChoice('venue', $event)"
          @reopen="confirmChoice('venue', null)"
        />

        <RouterLink
          v-if="finalStation"
          :to="{
            name: 'meetup-summary',
            params: { code },
            query: { station: finalStation.optionId },
          }"
          class="app-btn btn-teal app-btn-lg w-100"
          data-testid="results-summary-link"
        >
          See the summary
        </RouterLink>
      </div>

      <div class="col-lg-7">
        <MapView
          :key="selectedId"
          :starts="starts"
          :candidates="ranking"
          :selected-id="selectedId"
          @select="selectedId = $event"
        />
        <div v-if="venuePoint" class="mt-4">
          <h2 class="mb-1">Places near {{ venuePoint.name }}</h2>
          <p v-if="finalStation && !finalVenue && isMember" class="text-muted">
            Vote for where to go. Places with votes appear in the venue vote.
          </p>
          <p v-else-if="!finalStation" class="text-muted">
            Venue voting opens once the host confirms a meeting point.
          </p>
          <VenueList
            :key="venuePoint.lat + ',' + venuePoint.lng"
            :lat="venuePoint.lat"
            :lng="venuePoint.lng"
          >
            <template #venue-actions="{ venue }">
              <button
                v-if="finalStation && !finalVenue && isMember"
                type="button"
                class="app-btn app-btn-sm mt-2 align-self-start"
                :class="
                  votes && votes.venue.myVote === venue.venueKey ? 'btn-teal' : 'btn-teal-outline'
                "
                :aria-pressed="votes !== null && votes.venue.myVote === venue.venueKey"
                :disabled="isVoting"
                @click="voteForVenue(venue)"
                data-testid="venue-vote-button"
              >
                {{
                  votes && votes.venue.myVote === venue.venueKey
                    ? 'Your vote'
                    : 'Vote for this place'
                }}
              </button>
            </template>
          </VenueList>
        </div>
      </div>
    </div>
  </section>
</template>
