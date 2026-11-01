<!--
  FILE:     src/views/MeetupsView.vue
  OWNER:    JS (team-written)
  PURPOSE:  The logged-in user's meetups, in Current and Past tabs
  ROUTE:    /meetups (log in required)
  TALKS TO: GET /api/meetups/mine
  DATA:     { current: [ Item ], past: [ Item ] }
            Item { code, occasion, date, time, hostName, memberCount, myMemberId, isHost,
                   finalStation, finalVenue }
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { formatDate } from '../utils/meetup-date'

const router = useRouter()
const auth = useAuthStore()

const current = ref([])
const past = ref([])
const activeTab = ref('current')
const isLoading = ref(true)
const errorMessage = ref('')

const tabs = computed(() => [
  { id: 'current', label: `Current (${current.value.length})` },
  { id: 'past', label: `Past (${past.value.length})` },
])

const shownMeetups = computed(() => (activeTab.value === 'current' ? current.value : past.value))

async function loadMeetups() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const response = await axios.get(`${BASE_URL}/meetups/mine`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    current.value = response.data.current
    past.value = response.data.past
    // The lobby finds "me" in localStorage, so this also works on a new device
    for (const meetup of [...current.value, ...past.value]) {
      localStorage.setItem(`fairspot-member-${meetup.code}`, meetup.myMemberId)
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      auth.clearSession()
      router.push('/login')
      return
    }
    errorMessage.value = 'Unable to load your meetups. Please try again.'
  }
  isLoading.value = false
}

// Past meetups with a confirmed meeting point open their summary; everything else, the lobby
function meetupLink(meetup) {
  if (activeTab.value === 'past' && meetup.finalStation) {
    return { name: 'meetup-summary', params: { code: meetup.code } }
  }
  return { name: 'meetup-lobby', params: { code: meetup.code } }
}

onMounted(loadMeetups)
</script>

<template>
  <section class="row justify-content-center" data-testid="meetups-page">
    <div class="col-lg-9">
      <header class="app-page-header">
        <h1 class="app-heading mb-0">My Meetups</h1>
      </header>

      <div v-if="isLoading" class="text-center my-5" data-testid="meetups-loading">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading your meetups…</span>
        </div>
      </div>

      <div v-else-if="errorMessage" class="alert alert-danger" role="alert">
        <p class="mb-2" data-testid="meetups-error">{{ errorMessage }}</p>
        <button
          type="button"
          class="btn app-btn btn-outline-danger app-btn-sm"
          @click="loadMeetups"
        >
          Try again
        </button>
      </div>

      <div v-else class="card app-card">
        <ul class="nav nav-fill app-tabs" role="tablist">
          <li v-for="tab in tabs" :key="tab.id" class="nav-item" role="presentation">
            <button
              type="button"
              class="nav-link"
              :class="{ active: activeTab === tab.id }"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :data-testid="`meetups-tab-${tab.id}`"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </li>
        </ul>

        <div class="card-body p-3 p-md-4" role="tabpanel">
          <div v-if="shownMeetups.length === 0" class="app-empty" data-testid="meetups-empty">
            <template v-if="activeTab === 'current'">
              <p>You have no current meetups.</p>
              <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
                <RouterLink class="app-btn btn-sign" :to="{ name: 'create-meetup' }">
                  Create Meetup
                </RouterLink>
                <RouterLink class="app-btn btn-quiet" :to="{ name: 'join-meetup' }">
                  Join Meetup
                </RouterLink>
              </div>
            </template>
            <p v-else class="mb-0">Meetups move here after their date has passed.</p>
          </div>

          <ul v-else class="list-unstyled row g-3 mb-0">
            <li v-for="meetup in shownMeetups" :key="meetup.code" class="col-md-6">
              <article class="meetup-item h-100 d-flex flex-column" data-testid="meetup-item">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <h2 class="h5 app-heading text-break mb-0">{{ meetup.occasion }}</h2>
                  <span v-if="meetup.isHost" class="badge rounded-pill text-uppercase text-bg-dark">
                    Host
                  </span>
                </div>
                <dl class="row small mb-3">
                  <dt class="col-4 text-muted">When</dt>
                  <dd class="col-8 mb-1">{{ formatDate(meetup.date) }}, {{ meetup.time }}</dd>
                  <dt class="col-4 text-muted">Members</dt>
                  <dd class="col-8 mb-1">{{ meetup.memberCount }}</dd>
                  <dt class="col-4 text-muted">Meeting at</dt>
                  <dd class="col-8 mb-1">
                    {{ meetup.finalStation ? meetup.finalStation.name : 'Not decided' }}
                  </dd>
                  <template v-if="meetup.finalVenue">
                    <dt class="col-4 text-muted">Venue</dt>
                    <dd class="col-8 mb-1">{{ meetup.finalVenue.name }}</dd>
                  </template>
                </dl>
                <RouterLink
                  class="app-btn btn-sign-outline app-btn-sm align-self-start mt-auto"
                  :to="meetupLink(meetup)"
                  data-testid="meetup-open"
                >
                  {{ activeTab === 'past' && meetup.finalStation ? 'View summary' : 'View meetup' }}
                </RouterLink>
              </article>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* One meetup in the list */
.meetup-item {
  padding: 16px;
  border: 2px solid #000000;
  border-radius: 8px;
}
</style>
