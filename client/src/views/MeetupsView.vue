<!-- The logged-in user's current and past meetups, and their notices. -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { formatDate, todayInSingapore } from '../utils/meetup-date'

const MEETUPS_REFRESH_MS = 5000

const router = useRouter()
const auth = useAuthStore()
let refreshTimer = null

const current = ref([])
const past = ref([])
const notices = ref([])
const activeTab = ref('current')
const isLoading = ref(true)
const errorMessage = ref('')

const tabs = computed(() => [
  { id: 'current', label: `Current (${current.value.length})` },
  { id: 'past', label: `Past (${past.value.length})` },
])

const shownMeetups = computed(() => (activeTab.value === 'current' ? current.value : past.value))

async function fetchMeetups() {
  const response = await axios.get(`${BASE_URL}/meetups/mine`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  current.value = response.data.current
  past.value = response.data.past
  notices.value = response.data.notices || []
  for (const meetup of [...current.value, ...past.value]) {
    localStorage.setItem(`fairspot-member-${meetup.code}`, meetup.myMemberId)
  }
}

async function loadMeetups() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await fetchMeetups()
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

// The timer's quiet version of loadMeetups: no spinner, and a failed refresh keeps the last list
async function refreshMeetups() {
  try {
    await fetchMeetups()
    errorMessage.value = ''
  } catch (error) {
    if (error.response && error.response.status === 401) {
      auth.clearSession()
      router.push('/login')
    }
  }
}

async function dismissNotice(notice) {
  notices.value = notices.value.filter((n) => n._id !== notice._id)
  try {
    await axios.delete(`${BASE_URL}/meetups/notices/${notice._id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
  } catch {
    // it comes back on the next refresh
  }
}

// Past meetups with a confirmed meeting point open their summary; everything else, the lobby
function meetupLink(meetup) {
  if (activeTab.value === 'past' && meetup.finalStation) {
    return { name: 'meetup-summary', params: { code: meetup.code } }
  }
  return { name: 'meetup-lobby', params: { code: meetup.code } }
}

// The live map only opens around the meetup, so the link shows on the day, once a point is confirmed
function hasLiveMap(meetup) {
  return activeTab.value === 'current' && meetup.finalStation && meetup.date === todayInSingapore()
}

onMounted(() => {
  loadMeetups()
  refreshTimer = setInterval(refreshMeetups, MEETUPS_REFRESH_MS)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})
</script>

<template>
  <section class="row justify-content-center" data-testid="meetups-page">
    <div class="col-lg-9">
      <header class="app-page-header">
        <h1 class="app-heading mb-0">My Meetups</h1>
      </header>

      <div
        v-for="notice in notices"
        :key="notice._id"
        class="alert alert-warning alert-dismissible"
        role="alert"
        data-testid="meetups-notice"
      >
        {{ notice.message }}
        <button
          type="button"
          class="btn-close"
          aria-label="Dismiss"
          @click="dismissNotice(notice)"
          data-testid="meetups-notice-dismiss"
        ></button>
      </div>

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
                <div class="d-flex flex-wrap gap-2 mt-auto">
                  <RouterLink
                    class="app-btn btn-sign-outline app-btn-sm"
                    :to="meetupLink(meetup)"
                    data-testid="meetup-open"
                  >
                    {{
                      activeTab === 'past' && meetup.finalStation ? 'View summary' : 'View meetup'
                    }}
                  </RouterLink>
                  <RouterLink
                    v-if="hasLiveMap(meetup)"
                    class="app-btn btn-sign app-btn-sm"
                    :to="{ name: 'meetup-live', params: { code: meetup.code } }"
                    data-testid="meetup-live"
                  >
                    Live map
                  </RouterLink>
                </div>
              </article>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.meetup-item {
  padding: 16px;
  border: 2px solid #000000;
  border-radius: 8px;
}
</style>
