<!--
  FILE:     src/views/MeetupLobbyView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  Meetup home: details, share code, member list; each member sets their start point
  ROUTE:    /meetup/:code
  TALKS TO: GET /api/meetups/:code, PUT /api/meetups/:code/members/:memberId
            uses AddressSearch, MemberList
  DATA:     Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
            sends { start: { label, postal, lat, lng } }
  REVISE:   Wk 4 route params · Wk 5 onMounted + Axios GET/PUT · Wk 6 props, emits, localStorage
  DONE WHEN:
    - [ ] details + code shown
    - [ ] members with start status
    - [ ] "you" can set or change your start
    - [ ] button to results once at least 2 members have a start
    - [ ] responsive
    - [ ] testids
-->
<script setup>
// STEPS (script: TODO 1-5 · template: TODO 6-11)
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Imports: ref, computed, onMounted, axios, BASE_URL, useRoute.
//         Example: route params in Week 4/wk4_example/src/components/Example10.vue
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { BASE_URL } from '../config'

import AddressSearch from '../components/AddressSearch.vue'
import MemberList from '../components/MemberList.vue'
import EditMeetupForm from '../components/EditMeetupForm.vue'
import SavedStartPointPicker from '../components/SavedStartPointPicker.vue'
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
// TODO 2: Read the meetup code from the route params. Add refs for the meetup (null),
//         "is loading" (true) and an error message.
const route = useRoute()
const router = useRouter()
const code = route.params.code

const meetup = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const actionError = ref('')
const myMemberId = ref(null)

const isEditing = ref(false)
const showDeleteConfirm = ref(false)

// Use the server's { error: "..." } message if there is one, otherwise a fallback
function getErrorText(error, fallback) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error
  }
  return fallback
}

// TODO 3: async function loadMeetup(): GET ${BASE_URL}/meetups/<code> in try/catch.
//         Show "No meetup with code ..." on a 404 and a generic message otherwise.
//         Always finish loading.
//         Example: fetchStudents in Week 6/Code_Along/client/src/App.vue
async function loadMeetup() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await axios.get(`${BASE_URL}/meetups/${code}`)
    meetup.value = response.data
  } catch (error) {
    if (error.response && error.response.status === 404) {
      errorMessage.value = `No meetup with code ${code} was found.`
    } else {
      errorMessage.value = 'Failed to load meetup details. Please try again.'
    }
  }

  isLoading.value = false
}

// TODO 4: In onMounted: call loadMeetup() and read "my" member id from localStorage
//         (fairspot-member-<code>) into a ref.
onMounted(() => {
  myMemberId.value = localStorage.getItem(`fairspot-member-${code}`)
  loadMeetup()
})
// TODO 5: A computed that says whether "I" am a member of this meetup.
const isMember = computed(() => {
  if (!meetup.value || !meetup.value.members || !myMemberId.value) {
    return false
  }

  let found = false
  for (let i = 0; i < meetup.value.members.length; i++) {
    if (meetup.value.members[i]._id === myMemberId.value) {
      found = true
      break
    }
  }
  return found
})

// Assuming the first member in the array is the creator/host
const hostId = computed(() => meetup.value?.members?.[0]?._id)
const isHost = computed(() => isMember.value && myMemberId.value === hostId.value)

const canSeeResults = computed(() => {
  if (!meetup.value || !meetup.value.members) return false
  const readyCount = meetup.value.members.filter((m) => m.start !== null).length
  return readyCount >= 2
})

// The ranking needs two start points and leaves out anyone still without one
const startWarning = computed(() => {
  if (!meetup.value || !meetup.value.members) return ''
  if (!canSeeResults.value) return 'Results open once everyone has a start point.'
  const isWaiting = meetup.value.members.some((m) => m.start === null)
  return isWaiting ? 'Results leave out anyone without a start point.' : ''
})
//Set start point
async function handleSetStart(startPoint) {
  actionError.value = ''
  try {
    await axios.put(`${BASE_URL}/meetups/${code}/members/${myMemberId.value}`, {
      start: startPoint,
    })
    await loadMeetup()
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to set start point.')
  }
}
//Host tools (edit)
async function handleEdit(details) {
  actionError.value = ''
  try {
    await axios.put(
      `${BASE_URL}/meetups/${code}`,
      {
        occasion: details.occasion,
        date: details.date,
        time: details.time,
      },
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    )
    isEditing.value = false
    await loadMeetup()
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to update meetup.')
  }
}

//Host tools (Delete)
async function handleDelete() {
  actionError.value = ''
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    localStorage.removeItem(`fairspot-member-${code}`)
    router.push('/')
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to delete meetup.')
  }
}

//Leave (non-hosts)
async function handleLeave() {
  actionError.value = ''
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}/members/${myMemberId.value}`)
    localStorage.removeItem(`fairspot-member-${code}`)
    router.push('/')
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to leave meetup.')
  }
}
</script>

<template>
  <section data-testid="meetup-lobby-page">
    <header class="app-page-header">
      <h1 class="app-heading mb-0">Meetup Lobby</h1>
    </header>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center my-5" data-testid="lobby-loading">
      <div class="spinner-border text-sign" role="status">
        <span class="visually-hidden">Loading..</span>
      </div>
    </div>

    <!-- Error alert -->
    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="lobby-error">
      {{ errorMessage }}
    </div>

    <!-- Meetup Content -->
    <div v-else-if="meetup">
      <div
        v-if="actionError"
        class="alert alert-danger alert-dismissible"
        role="alert"
        data-testid="lobby-action-error"
      >
        {{ actionError }}
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          @click="actionError = ''"
        ></button>
      </div>
      <div class="row">
        <!-- Left Column: Details & Tools -->
        <div class="col-lg-7 mb-3">
          <!-- Details card -->
          <div class="card app-card mb-3">
            <div class="card-body">
              <div v-if="isEditing">
                <EditMeetupForm :meetup="meetup" @save="handleEdit" @cancel="isEditing = false" />
              </div>
              <div v-else>
                <div class="row align-items-center g-3">
                  <div class="col-sm-5">
                    <h2 class="mb-2" data-testid="lobby-occasion">
                      {{ meetup.occasion }}
                    </h2>
                    <dl class="row mb-0">
                      <dt class="col-3 text-muted fw-normal">Date</dt>
                      <dd class="col-9 mb-1">{{ meetup.date }}</dd>
                      <dt class="col-3 text-muted fw-normal">Time</dt>
                      <dd class="col-9 mb-1">{{ meetup.time }}</dd>
                      <dt class="col-3 text-muted fw-normal">Host</dt>
                      <dd class="col-9 mb-0" data-testid="lobby-host">{{ meetup.hostName }}</dd>
                    </dl>
                  </div>
                  <div class="col-sm-7">
                    <div class="app-ticket">
                      <span class="app-label">Share this code with your group</span>
                      <span class="app-code mt-2" data-testid="lobby-code">{{ meetup.code }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Set my start point -->
          <div v-if="isMember" class="card app-card" data-testid="lobby-set-start">
            <div class="card-body">
              <h3 class="mb-3">Your start point</h3>
              <SavedStartPointPicker
                v-if="auth.isLoggedIn"
                :key="auth.token"
                @select="handleSetStart"
              />
              <AddressSearch @select="handleSetStart" />
            </div>
          </div>
        </div>

        <!-- Right Column: Members & Actions -->
        <div class="col-lg-5">
          <!-- MemberList Component replacing inline code -->
          <div class="card app-card mb-3">
            <div class="card-body">
              <h3 class="mb-3">Members</h3>
              <MemberList
                :members="meetup.members"
                :currentMemberId="myMemberId"
                :hostId="hostId"
              />
            </div>
          </div>

          <!-- "See fair meeting points" link -->
          <div v-if="startWarning" class="alert alert-warning" data-testid="lobby-start-warning">
            {{ startWarning }}
          </div>
          <div v-if="canSeeResults" class="mb-3">
            <router-link
              :to="`/meetup/${code}/results`"
              class="app-btn app-btn-lg btn-sign w-100"
              data-testid="lobby-results-link"
            >
              See fair meeting points
            </router-link>
          </div>

          <!-- TODO 9: Join meetup link -->
          <div v-if="!isMember" class="text-center">
            <router-link
              to="/join"
              class="app-btn app-btn-lg btn-sign w-100"
              data-testid="lobby-join-link"
            >
              Join this meetup
            </router-link>
          </div>

          <!-- Host tools & Leave options -->
          <div v-if="isMember" class="card app-card">
            <div class="card-body">
              <h3 class="h6 app-heading mb-3">Manage meetup</h3>

              <!-- Host Tools -->
              <div v-if="isHost" class="d-flex flex-wrap gap-2">
                <button
                  v-if="!isEditing"
                  @click="isEditing = true"
                  class="app-btn btn-sign-outline"
                  data-testid="lobby-edit"
                >
                  Edit Meetup Details
                </button>

                <div v-if="showDeleteConfirm" class="alert alert-secondary p-3 mb-0 w-100">
                  <p class="mb-2">Are you sure? This will delete the meetup for everyone.</p>
                  <div class="d-flex gap-2">
                    <button
                      @click="handleDelete"
                      class="btn app-btn btn-danger app-btn-sm"
                      data-testid="lobby-delete-confirm"
                    >
                      Yes, Delete it
                    </button>
                    <button @click="showDeleteConfirm = false" class="app-btn btn-quiet app-btn-sm">
                      Cancel
                    </button>
                  </div>
                </div>
                <button
                  v-else
                  @click="showDeleteConfirm = true"
                  class="btn app-btn btn-outline-danger"
                  data-testid="lobby-delete"
                >
                  Delete Meetup
                </button>
              </div>

              <!-- Non-Host Leave -->
              <div v-else>
                <button
                  @click="handleLeave"
                  class="btn app-btn btn-outline-danger"
                  data-testid="lobby-leave"
                >
                  Leave Meetup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
