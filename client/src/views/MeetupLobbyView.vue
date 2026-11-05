<!-- Meetup lobby: details, share code and members. Each member sets a start point and travel mode, then confirms. -->
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { formatDate } from '../utils/meetup-date'

import AddressSearch from '../components/AddressSearch.vue'
import MemberList from '../components/MemberList.vue'
import EditMeetupForm from '../components/EditMeetupForm.vue'
import SavedStartPointPicker from '../components/SavedStartPointPicker.vue'
import TravelModePicker from '../components/TravelModePicker.vue'
import { useAuthStore } from '../stores/auth'
import { memberAuthConfig } from '../utils/member-auth'
const auth = useAuthStore()
const MEETUP_REFRESH_MS = 5000
let refreshTimer = null

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
const memberToRemove = ref(null)

// Use the server's { error: "..." } message if there is one, otherwise a fallback
function getErrorText(error, fallback) {
  if (error.response && error.response.data && error.response.data.error) {
    return error.response.data.error
  }
  return fallback
}

// Handles a failed member action: 401 asks to log in again, 403 "not a member" forgets this browser's place
function handleMemberError(error, fallback) {
  const status = error.response ? error.response.status : 0
  if (status === 401) {
    auth.clearSession()
    router.push('/login')
    return
  }
  if (status === 403 && getErrorText(error, '') === 'You are not a member of this meetup.') {
    localStorage.removeItem(`fairspot-member-${code}`)
    localStorage.removeItem(`fairspot-member-token-${code}`)
    myMemberId.value = null
    actionError.value =
      'This browser is no longer linked to your place in this meetup. Join again with the code (use a new name if you were a guest).'
    return
  }
  actionError.value = getErrorText(error, fallback)
}

// Loads the meetup, with "No meetup with code ..." on a 404 and a generic message otherwise
async function loadMeetup() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await axios.get(
      `${BASE_URL}/meetups/${code}`,
      memberAuthConfig(code, auth.token),
    )
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

// The timer's quiet version of loadMeetup: no spinner, and a failed refresh keeps the last details
async function refreshMeetup() {
  try {
    const response = await axios.get(
      `${BASE_URL}/meetups/${code}`,
      memberAuthConfig(code, auth.token),
    )
    meetup.value = response.data
    errorMessage.value = ''
  } catch (error) {
    if (error.response && error.response.status === 404) {
      clearInterval(refreshTimer)
      if (isHost.value && auth.isLoggedIn) {
        router.push('/meetups')
        return
      }
      errorMessage.value = `No meetup with code ${code} was found.`
    }
  }
}

onMounted(() => {
  myMemberId.value = localStorage.getItem(`fairspot-member-${code}`)
  loadMeetup()
  refreshTimer = setInterval(refreshMeetup, MEETUP_REFRESH_MS)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})

// Whether "I" am a member of this meetup
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

// members[0] is the host: the server adds the host first when the meetup is created
const hostId = computed(() => meetup.value?.members?.[0]?._id)
const isHost = computed(() => isMember.value && myMemberId.value === hostId.value)

// Only the host works out the fair meeting points, once every member (at least 2) has confirmed
const canCalculate = computed(() => {
  if (!meetup.value || !meetup.value.members) return false
  const { members } = meetup.value
  const confirmed = members.filter((m) => m.ready)
  if (meetup.value.finalStation) return confirmed.length >= 2
  return members.length >= 2 && confirmed.length === members.length
})

// Once the host has worked out the fair meeting points, nobody can join and locations are locked
const isLocked = computed(() => Boolean(meetup.value && meetup.value.rankedAt))

// Who left after the host worked out the fair meeting points, e.g. "Wei Jie and Marcus"
const leftNames = computed(() => {
  const names = (meetup.value && meetup.value.leftSinceRanking) || []
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
})

// Members can vote once the host has worked out the fair meeting points
const canVote = computed(() => isMember.value && !isHost.value && meetup.value.rankedAt !== null)

const startWarning = computed(() => {
  if (!meetup.value || !meetup.value.members || !isMember.value) return ''
  const { members } = meetup.value
  if (members.length < 2) return 'Results open once someone else joins.'
  if (isHost.value) {
    if (!canCalculate.value) {
      return 'You can work out the fair meeting points once everyone has confirmed their location.'
    }
    const isWaiting = members.some((m) => !m.ready)
    return isWaiting ? "Results leave out anyone who hasn't confirmed their location." : ''
  }
  if (!meetup.value.rankedAt) {
    return 'The host will work out the fair meeting points once everyone has confirmed their location.'
  }
  return ''
})

const copyLabel = ref('Copy code')

async function copyCode() {
  try {
    await navigator.clipboard.writeText(meetup.value.code)
    copyLabel.value = 'Copied'
  } catch {
    copyLabel.value = 'Select and copy the code'
  }
}

// This member's start point in the meetup, or null if they haven't set one
const myStart = computed(() => {
  if (!meetup.value) return null
  const me = meetup.value.members.find((member) => member._id === myMemberId.value)
  return me ? me.start : null
})

// Whether this member has pressed Confirm location (changing the start or mode undoes it)
const myReady = computed(() => {
  if (!meetup.value) return false
  const me = meetup.value.members.find((member) => member._id === myMemberId.value)
  return me ? me.ready : false
})

// This member's travel mode: public transport unless they choose otherwise
const myMode = computed(() => {
  if (!meetup.value) return 'transit'
  const me = meetup.value.members.find((member) => member._id === myMemberId.value)
  return me ? me.travelMode : 'transit'
})

async function handleSetMode(travelMode) {
  actionError.value = ''
  if (travelMode === myMode.value) return
  try {
    await axios.put(
      `${BASE_URL}/meetups/${code}/me/mode`,
      { travelMode },
      memberAuthConfig(code, auth.token),
    )
    await refreshMeetup()
  } catch (err) {
    handleMemberError(err, 'Failed to save how you are getting there.')
  }
}

async function handleSetStart(startPoint) {
  actionError.value = ''
  try {
    await axios.put(
      `${BASE_URL}/meetups/${code}/me`,
      { start: startPoint },
      memberAuthConfig(code, auth.token),
    )
    await loadMeetup()
  } catch (err) {
    handleMemberError(err, 'Failed to set start point.')
  }
}
async function handleConfirmLocation() {
  actionError.value = ''
  try {
    await axios.put(
      `${BASE_URL}/meetups/${code}/me/ready`,
      { ready: true },
      memberAuthConfig(code, auth.token),
    )
    await refreshMeetup()
  } catch (err) {
    handleMemberError(err, 'Failed to confirm your location.')
  }
}
const isRecalculating = ref(false)

async function handleRecalculate() {
  actionError.value = ''
  isRecalculating.value = true
  try {
    await axios.post(
      `${BASE_URL}/ranking/${code}`,
      {},
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    router.push(`/meetup/${code}/results`)
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to recalculate the fair meeting points.')
  }
  isRecalculating.value = false
}
// Host: saves new meetup details
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

// Host: deletes the meetup
async function handleDelete() {
  actionError.value = ''
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    localStorage.removeItem(`fairspot-member-${code}`)
    localStorage.removeItem(`fairspot-member-token-${code}`)
    router.push('/')
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to delete meetup.')
  }
}

// Host: removes a member
async function handleRemove() {
  actionError.value = ''
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}/members/${memberToRemove.value._id}/remove`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    memberToRemove.value = null
    await refreshMeetup()
  } catch (err) {
    actionError.value = getErrorText(err, 'Failed to remove member.')
  }
}

// A member who isn't the host leaves the meetup
async function handleLeave() {
  actionError.value = ''
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}/me`, memberAuthConfig(code, auth.token))
    localStorage.removeItem(`fairspot-member-${code}`)
    localStorage.removeItem(`fairspot-member-token-${code}`)
    router.push('/')
  } catch (err) {
    handleMemberError(err, 'Failed to leave meetup.')
  }
}
</script>

<template>
  <section data-testid="meetup-lobby-page">
    <header class="app-page-header">
      <h1 class="app-heading mb-0">Meetup Lobby</h1>
    </header>

    <div v-if="isLoading" class="text-center my-5" data-testid="lobby-loading">
      <div class="spinner-border text-sign" role="status">
        <span class="visually-hidden">Loading..</span>
      </div>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="lobby-error">
      {{ errorMessage }}
    </div>

    <div v-else-if="meetup">
      <div
        v-if="isHost && leftNames"
        class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2"
        data-testid="lobby-left-notice"
      >
        <p class="mb-0">
          {{ leftNames }} left the meetup after you worked out the fair meeting points.
        </p>
        <button
          type="button"
          class="app-btn btn-sign app-btn-sm"
          :disabled="isRecalculating"
          @click="handleRecalculate"
          data-testid="lobby-recalculate"
        >
          {{ isRecalculating ? 'Recalculating… this can take a minute' : 'Recalculate' }}
        </button>
      </div>
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
        <div class="col-lg-7 mb-3">
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
                      <dd class="col-9 mb-1">{{ formatDate(meetup.date) }}</dd>
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
                    <button
                      type="button"
                      class="app-btn btn-quiet w-100 mt-2"
                      @click="copyCode"
                      data-testid="lobby-copy"
                    >
                      {{ copyLabel }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isMember" class="card app-card" data-testid="lobby-set-start">
            <div class="card-body">
              <h3 class="mb-3">Your start point</h3>
              <template v-if="isLocked">
                <p class="mb-0" data-testid="lobby-locked-start">
                  {{ myStart ? myStart.label : 'No start point' }}
                </p>
                <h3 class="mt-4 mb-3">How you're getting there</h3>
                <p class="mb-0">{{ myMode === 'car' ? 'Car' : 'Public transport' }}</p>
                <p v-if="isHost" class="small text-muted mt-3 mb-0">
                  Locked because you have worked out the fair meeting points.
                </p>
                <p v-else class="small text-muted mt-3 mb-0">
                  Locked because the host has worked out the fair meeting points. You can still
                  leave the meetup.
                </p>
              </template>
              <template v-else>
                <SavedStartPointPicker
                  v-if="auth.isLoggedIn"
                  :key="auth.token"
                  :current-start="myStart"
                  @select="handleSetStart"
                >
                  <AddressSearch @select="handleSetStart" />
                </SavedStartPointPicker>
                <AddressSearch v-else @select="handleSetStart" />
                <h3 class="mt-4 mb-3">How you're getting there</h3>
                <TravelModePicker :current-mode="myMode" @select="handleSetMode" />
                <p v-if="myMode === 'car'" class="small text-muted mt-2 mb-0">
                  Your trip times include 10 minutes to park, but not traffic.
                </p>
              </template>
            </div>
          </div>
        </div>

        <div class="col-lg-5">
          <div class="card app-card mb-3">
            <div class="card-body">
              <h3 class="mb-3">Members</h3>
              <MemberList
                :members="meetup.members"
                :currentMemberId="myMemberId"
                :hostId="hostId"
                :can-remove="isHost"
                @remove="memberToRemove = $event"
              />
              <div
                v-if="memberToRemove"
                class="alert alert-secondary p-3 mt-3 mb-0"
                data-testid="lobby-remove-prompt"
              >
                <p class="mb-2">
                  Remove {{ memberToRemove.name }}? Their start point and votes are deleted too.
                </p>
                <div class="d-flex gap-2">
                  <button
                    type="button"
                    class="btn app-btn btn-danger app-btn-sm"
                    data-testid="lobby-remove-confirm"
                    @click="handleRemove"
                  >
                    Yes, remove
                  </button>
                  <button
                    type="button"
                    class="app-btn btn-quiet app-btn-sm"
                    @click="memberToRemove = null"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isMember" class="mb-3">
            <p v-if="myReady" class="alert alert-success mb-0" data-testid="lobby-confirmed">
              Location confirmed.
              <template v-if="!isLocked">
                Changing your start point or travel mode undoes this.
              </template>
            </p>
            <button
              v-else-if="!isLocked"
              type="button"
              class="app-btn btn-sign w-100"
              :disabled="!myStart"
              @click="handleConfirmLocation"
              data-testid="lobby-confirm-location"
            >
              Confirm location
            </button>
            <p v-if="!myStart && !isLocked" class="small text-muted mt-2 mb-0">
              Choose a start point first.
            </p>
          </div>

          <div v-if="startWarning" class="alert alert-warning" data-testid="lobby-start-warning">
            {{ startWarning }}
          </div>
          <div v-if="isHost && canCalculate" class="mb-3">
            <router-link
              :to="`/meetup/${code}/results`"
              class="app-btn app-btn-lg btn-sign w-100"
              data-testid="lobby-results-link"
            >
              See fair meeting points
            </router-link>
          </div>
          <div v-else-if="canVote" class="mb-3">
            <router-link
              :to="`/meetup/${code}/results`"
              class="app-btn app-btn-lg btn-sign w-100"
              data-testid="lobby-vote-link"
            >
              {{ meetup.finalStation ? 'View meeting points' : 'Vote on meeting points' }}
            </router-link>
          </div>

          <div v-if="isMember && meetup.finalStation" class="row g-2 mb-3">
            <div class="col-sm-6">
              <router-link
                :to="`/meetup/${code}/summary`"
                class="app-btn btn-quiet w-100"
                data-testid="lobby-summary-link"
              >
                See the summary
              </router-link>
            </div>
            <div class="col-sm-6">
              <router-link
                :to="`/meetup/${code}/live`"
                class="app-btn btn-sign w-100"
                data-testid="lobby-live-link"
              >
                Live map
              </router-link>
            </div>
          </div>

          <p v-if="!isMember && isLocked" class="alert alert-secondary" data-testid="lobby-closed">
            This meetup is closed to new members because the host has worked out the fair meeting
            points.
          </p>
          <div v-else-if="!isMember" class="text-center">
            <router-link
              to="/join"
              class="app-btn app-btn-lg btn-sign w-100"
              data-testid="lobby-join-link"
            >
              Join this meetup
            </router-link>
          </div>

          <div v-if="isMember">
            <div v-if="isHost" class="row g-2">
              <div v-if="!isEditing" :class="showDeleteConfirm ? 'col-12' : 'col-sm-6'">
                <button
                  @click="isEditing = true"
                  class="app-btn btn-sign-outline w-100"
                  data-testid="lobby-edit"
                >
                  Edit Meetup Details
                </button>
              </div>

              <div v-if="showDeleteConfirm" class="col-12">
                <div class="alert alert-secondary p-3 mb-0">
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
              </div>
              <div v-else :class="isEditing ? 'col-12' : 'col-sm-6'">
                <button
                  @click="showDeleteConfirm = true"
                  class="btn app-btn btn-outline-danger w-100"
                  data-testid="lobby-delete"
                >
                  Delete Meetup
                </button>
              </div>
            </div>

            <div v-else>
              <button
                @click="handleLeave"
                class="btn app-btn btn-outline-danger w-100"
                data-testid="lobby-leave"
              >
                Leave Meetup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
