<!--
  FILE:     src/views/MeetupResultsView.vue
  OWNER:    JS (team-written)
  PURPOSE:  The fairest meeting points for a meetup, and group voting: members vote on the
            shortlisted meeting points, then on venues near the confirmed one; the host confirms
            each final choice. Everyone sees the saved results (GET); only the host works them out
            (POST), the first time they open this page or when they press Recalculate
  ROUTE:    /meetup/:code/results
  TALKS TO: GET /api/meetups/:code, POST /api/ranking/:code (host, logged in),
            GET /api/ranking/:code,
            GET/PUT /api/votes/:code, POST /api/votes/:code/confirm (host, logged in),
            DELETE /api/meetups/:code/me (a member leaves)
            PUT /api/votes/:code, DELETE .../me and GET /api/meetups/:code send who I am
            (utils/member-auth.js); the server works out which member that is
  POLLING:  vote tallies refresh every 5 seconds while this page is open (decided: no WebSockets)
-->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { memberAuthConfig } from '../utils/member-auth'
import { formatDate, formatTime } from '../utils/meetup-date'
import MeetingPointCard from '../components/MeetingPointCard.vue'
import MapView from '../components/MapView.vue'
import VenueList from '../components/VenueList.vue'
import VotePanel from '../components/VotePanel.vue'
import PlatformScene from '../components/PlatformScene.vue'

const VOTE_REFRESH_MS = 5000
const SHORTLIST_SIZE = 3

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const code = route.params.code

const meetup = ref(null)
const ranking = ref([])
const departure = ref(null)
const selectedId = ref('')
const myMemberId = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const isOutdated = ref(false) // the group changed (e.g. someone left) since these were worked out
const isRecalculating = ref(false)

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

// What went wrong with a vote or leaving:
//   - 401: my login has expired (e.g. I logged in somewhere else), so log in again
//   - 403 "not a member": this browser has nothing the server accepts for my place (e.g. a
//     guest who joined before guests were given a secret), so forget it and stop showing
//     the member controls. Any other 403 is just shown.
function handleMemberError(error, fallback) {
  const status = error.response ? error.response.status : 0
  if (status === 401) {
    auth.clearSession()
    router.push('/login')
    return
  }
  if (status === 403 && errorText(error, '') === 'You are not a member of this meetup.') {
    localStorage.removeItem(`fairspot-member-${code}`)
    localStorage.removeItem(`fairspot-member-token-${code}`)
    myMemberId.value = null
    voteError.value =
      'This browser is no longer linked to your place in this meetup. Join again with the code (use a new name if you were a guest).'
    return
  }
  voteError.value = errorText(error, fallback)
}

// Only the host works the meeting points out (or gets the saved ones back if nothing changed)
async function calculateRanking() {
  const headers = { Authorization: `Bearer ${auth.token}` }
  return (await axios.post(`${BASE_URL}/ranking/${code}`, {}, { headers })).data
}

// Everyone reads what the host last worked out. If nothing is saved yet, the host's visit
// works them out for the first time.
async function fetchRanking() {
  try {
    // As a member, each trip comes with its route and first bus stop (they start at home,
    // so the server leaves them out for anyone who only knows the code)
    return (await axios.get(`${BASE_URL}/ranking/${code}`, memberAuthConfig(code, auth.token))).data
  } catch (error) {
    if (isHost.value && error.response && error.response.status === 404) {
      return await calculateRanking()
    }
    throw error
  }
}

function showRanking(data) {
  ranking.value = data.ranking
  departure.value = data.departure
  isOutdated.value = data.isOutdated
  if (ranking.value.length > 0) {
    selectedId.value = ranking.value[0].stationId
  }
}

async function loadResults() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    // As a member, the start points come with lat/lng, so the map can show them
    const meetupResponse = await axios.get(
      `${BASE_URL}/meetups/${code}`,
      memberAuthConfig(code, auth.token),
    )
    meetup.value = meetupResponse.data
    showRanking(await fetchRanking())
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load the results. Please try again.')
  }
  isLoading.value = false
}

// The host works the meeting points out again for whoever is still in the meetup
async function recalculate() {
  isRecalculating.value = true
  voteError.value = ''
  try {
    showRanking(await calculateRanking())
    const meetupResponse = await axios.get(
      `${BASE_URL}/meetups/${code}`,
      memberAuthConfig(code, auth.token),
    )
    meetup.value = meetupResponse.data
    await loadVotes()
  } catch (error) {
    voteError.value = errorText(
      error,
      'The meeting points were not recalculated. Please try again.',
    )
  }
  isRecalculating.value = false
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

const topPoints = computed(() => ranking.value.slice(0, SHORTLIST_SIZE))

// Once the host confirms a meeting point, it is the only one shown
const shownPoints = computed(() => {
  if (!finalStation.value) return topPoints.value
  const confirmed = ranking.value.filter((p) => p.stationId === finalStation.value.optionId)
  return confirmed.length > 0 ? confirmed : topPoints.value
})

// Same bar scale on every card, so a longer bar always means a longer trip
const scaleMinutes = computed(() => Math.max(0, ...topPoints.value.map((p) => p.longestMinutes)))

const hasDrivers = computed(() =>
  meetup.value.members.some((member) => member.travelMode === 'car'),
)

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
  const options = topPoints.value.map((point) => ({
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
    const response = await axios.put(
      `${BASE_URL}/votes/${code}`,
      {
        kind,
        optionId: option.optionId,
        optionName: option.name,
        lat: option.lat,
        lng: option.lng,
        address: option.address,
      },
      memberAuthConfig(code, auth.token),
    )
    applyVotes(response.data)
  } catch (error) {
    handleMemberError(error, 'Your vote was not saved. Please try again.')
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

// A member who doesn't like the confirmed meeting point leaves (the host deletes the meetup instead)
async function leaveMeetup() {
  isVoting.value = true
  voteError.value = ''
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}/me`, memberAuthConfig(code, auth.token))
    localStorage.removeItem(`fairspot-member-${code}`)
    localStorage.removeItem(`fairspot-member-token-${code}`)
    router.push('/')
  } catch (error) {
    handleMemberError(error, 'You could not leave the meetup. Please try again.')
  }
  isVoting.value = false
}

const venuePoint = computed(() => finalStation.value || selected.value)
</script>

<template>
  <section class="flex-grow-1 d-flex flex-column" data-testid="meetup-results-page">
    <header class="app-page-header d-flex flex-wrap justify-content-between align-items-end gap-2">
      <h1 class="app-heading mb-0">Fair meeting points</h1>
      <RouterLink :to="`/meetup/${code}`" class="app-btn btn-quiet app-btn-sm"
        >Back to lobby</RouterLink
      >
    </header>

    <!-- While loading, a train passes along the bottom of the page. It goes once the results arrive. -->
    <div v-if="isLoading" class="flex-grow-1 d-flex flex-column" data-testid="results-loading">
      <div class="text-center my-5">
        <div class="spinner-border text-sign" role="status"></div>
        <p class="text-muted mt-3 mb-0" role="status">
          Getting everyone's travel times from OneMap. This can take up to a minute.
        </p>
      </div>
      <PlatformScene class="loading-platform mt-auto" />
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="results-error">
      {{ errorMessage }}
    </div>

    <div v-else class="row g-4">
      <div v-if="departure && departure.time === '05:30'" class="col-12">
        <div class="alert alert-warning mb-0" role="status" data-testid="results-time-note">
          Travel times are for leaving at 5:30am on
          {{ formatDate(departure.date) }}.
        </div>
      </div>
      <div v-else-if="departure" class="col-12">
        <p class="small text-muted mb-0" data-testid="results-time-note">
          Travel times are calculated at {{ formatTime(departure.time) }} on
          {{ formatDate(departure.date) }}.
        </p>
      </div>
      <!-- The group changed (e.g. someone left): the host can recalculate -->
      <div v-if="isOutdated" class="col-12">
        <div class="alert alert-warning mb-0" role="status" data-testid="results-outdated-note">
          <template v-if="isHost">
            <p class="mb-2">The group has changed since you worked these out.</p>
            <button
              type="button"
              class="app-btn btn-sign app-btn-sm"
              :disabled="isRecalculating"
              @click="recalculate"
              data-testid="results-recalculate"
            >
              {{ isRecalculating ? 'Recalculating… this can take a minute' : 'Recalculate' }}
            </button>
          </template>
          <template v-else>The group has changed since the host worked these out.</template>
        </div>
      </div>
      <div v-if="hasDrivers" class="col-12 mt-2">
        <p class="small text-muted mb-0" data-testid="results-car-note">
          Car times include 10 minutes to park, but not traffic.
        </p>
      </div>
      <!-- Once the venue is confirmed the map and places go, so this column moves to the centre -->
      <div :class="finalVenue ? 'col-lg-6 mx-auto' : 'col-lg-5'">
        <div class="d-grid gap-3 mb-4" data-testid="results-list">
          <MeetingPointCard
            v-for="point in shownPoints"
            :key="point.stationId"
            :point="point"
            :rank="ranking.indexOf(point) + 1"
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
          final-title="Meeting point confirmed by the host"
          :options="stationOptions"
          :my-vote="votes ? votes.station.myVote : null"
          :voter-count="meetup ? meetup.members.length : 0"
          :can-vote="isMember"
          :is-host="isHost"
          :final="finalStation"
          :busy="isVoting"
          :can-leave="isMember && !isHost"
          @vote="castVote('station', $event)"
          @confirm="confirmChoice('station', $event)"
          @reopen="confirmChoice('station', null)"
          @leave="leaveMeetup"
        />

        <VotePanel
          v-if="finalStation"
          class="mb-4"
          title="Vote for a venue"
          final-title="Venue confirmed by the host"
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
          :to="{ name: 'meetup-summary', params: { code } }"
          class="app-btn app-btn-lg btn-sign w-100"
          data-testid="results-summary-link"
        >
          See the summary
        </RouterLink>
      </div>

      <div v-if="!finalVenue" class="col-lg-7">
        <MapView
          :key="`${selectedId}-${shownPoints.length}`"
          :starts="starts"
          :candidates="shownPoints"
          :selected-id="selectedId"
          @select="selectedId = $event"
        />
        <div v-if="venuePoint" class="mt-4">
          <h2 class="mb-3">Places near {{ venuePoint.name }}</h2>
          <div v-if="!finalStation" class="alert alert-warning" data-testid="venue-vote-warning">
            Venue voting opens once the host confirms a meeting point.
          </div>
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
                  votes && votes.venue.myVote === venue.venueKey ? 'btn-sign' : 'btn-sign-outline'
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

<style scoped>
/* The loading train runs the full width of the screen and sits on the footer
   (-44px cancels the bottom padding of .page-body) */
.loading-platform {
  margin-inline: calc(50% - 50vw);
  margin-bottom: -44px;
}
</style>
