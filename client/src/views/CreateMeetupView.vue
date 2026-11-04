<!--
  FILE:     src/views/CreateMeetupView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  Host creates a meetup and gets a shareable code. They can also tick people they often
            meet, who are added to the meetup straight away (anyone else joins with the code).
  ROUTE:    /create
  TALKS TO: GET /api/meetups/frequent, POST /api/meetups
  DATA:     GET /frequent → [ { userId, name, count } ] (count = meetups shared with me)
            sends { occasion, date, time, memberUserIds: [ userId ] } → receives Meetup
            Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  REVISE:   Wk 4 v-model, useRouter().push · Wk 5 Axios POST, async/await, try/catch, v-model modifiers
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { todayInSingapore, formatDate } from '../utils/meetup-date'

const router = useRouter()
const auth = useAuthStore()
const today = ref(todayInSingapore())
// The form's inputs, its error message, the created meetup (null until it exists) and whether
// it's being saved
const occasion = ref('')
const date = ref('')
const time = ref('')
const errorMessage = ref('')
const meetup = ref(null)
const isSaving = ref(false)
const copyLabel = ref('Copy code')
const frequentPeople = ref([]) // [ { userId, name, count } ], most shared meetups first
const pickedIds = ref([]) // the userIds ticked under "Add people you often meet"
const previewOccasion = computed(() => occasion.value || '[Occasion]')

// The people added straight away: everyone after the host
const addedNames = computed(() => {
  if (!meetup.value) return ''
  return meetup.value.members
    .slice(1)
    .map((member) => member.name)
    .join(', ')
})

// The accounts I've shared the most meetups with. If this fails the section just stays hidden,
// and creating a meetup still works.
async function loadFrequentPeople() {
  try {
    const response = await axios.get(`${BASE_URL}/meetups/frequent`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    frequentPeople.value = response.data
  } catch {
    frequentPeople.value = []
  }
}

function sharedLabel(count) {
  return count === 1 ? '1 meetup together' : `${count} meetups together`
}

onMounted(loadFrequentPeople)

// Checks the form, creates the meetup and remembers the host's member _id in localStorage
// (fairspot-member-<code>), so the lobby knows the host is "you"
async function createMeetup() {
  if (isSaving.value) return
  errorMessage.value = ''

  if (!occasion.value || !date.value || !time.value) {
    errorMessage.value = 'Please fill out all fields to create your meetup.'
    return
  }
  today.value = todayInSingapore()
  if (date.value < today.value) {
    errorMessage.value = 'Choose today or a future date.'
    return
  }
  isSaving.value = true

  try {
    const response = await axios.post(
      `${BASE_URL}/meetups`,
      {
        occasion: occasion.value,
        date: date.value,
        time: time.value,
        memberUserIds: pickedIds.value,
      },
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    meetup.value = response.data
    const code = response.data.code
    const hostId = response.data.members[0]._id
    localStorage.setItem(`fairspot-member-${code}`, hostId)
    // The host's secret for this meetup; the server only sends it this once
    localStorage.setItem(`fairspot-member-token-${code}`, response.data.memberToken)
    isSaving.value = false
  } catch (error) {
    if (error.response && error.response.status === 401) {
      auth.clearSession()
      router.push('/login')
    }
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage.value = error.response.data.error
    } else {
      errorMessage.value = 'Failed to create meetup. Please try again.'
    }
    isSaving.value = false
  }
}

function goToMeetup() {
  if (meetup.value && meetup.value.code) {
    router.push(`/meetup/${meetup.value.code}`)
  }
}

// Clipboard API (browser built-in, https://developer.mozilla.org/docs/Web/API/Clipboard/writeText)
async function copyCode() {
  try {
    await navigator.clipboard.writeText(meetup.value.code)
    copyLabel.value = 'Copied'
  } catch {
    copyLabel.value = 'Select and copy the code'
  }
}
</script>

<template>
  <section class="my-auto pt-3" data-testid="create-meetup-page">
    <header v-if="!meetup" class="app-page-header">
      <h1 class="app-heading mb-0">Create Meetup</h1>
    </header>
    <div v-if="!meetup" class="row g-4">
      <div class="col-lg-7">
        <div class="card app-card">
          <div class="card-body p-4">
            <form @submit.prevent="createMeetup">
              <div class="mb-3">
                <label for="occasion" class="form-label fw-bold">Occasion</label>
                <input
                  type="text"
                  id="occasion"
                  class="form-control app-input"
                  v-model.trim="occasion"
                  data-testid="create-occasion"
                  placeholder="e.g. Dinner, Project Meeting"
                />
              </div>

              <div class="row g-3 mb-3">
                <div class="col-sm-6">
                  <label for="date" class="form-label fw-bold">Date</label>
                  <input
                    type="date"
                    id="date"
                    class="form-control app-input"
                    v-model="date"
                    :min="today"
                    data-testid="create-date"
                  />
                </div>
                <div class="col-sm-6">
                  <label for="time" class="form-label fw-bold">Time</label>
                  <input
                    type="time"
                    id="time"
                    class="form-control app-input"
                    v-model="time"
                    data-testid="create-time"
                  />
                </div>
              </div>

              <!-- People I've shared meetups with: anyone ticked is added straight away -->
              <fieldset
                v-if="frequentPeople.length > 0"
                class="mb-3"
                data-testid="create-frequent-list"
              >
                <legend class="form-label fw-bold fs-6 mb-1">Add people you often meet</legend>
                <p class="small text-muted mb-2">
                  They're added straight away and get a notice in My Meetups. Anyone else can still
                  join with the code.
                </p>
                <div class="row row-cols-1 row-cols-sm-2 g-2">
                  <div
                    v-for="person in frequentPeople"
                    :key="person.userId"
                    class="col"
                    data-testid="create-frequent-person"
                  >
                    <div class="form-check mb-0">
                      <input
                        :id="`frequent-${person.userId}`"
                        v-model="pickedIds"
                        type="checkbox"
                        :value="person.userId"
                        class="form-check-input app-check"
                        :disabled="isSaving"
                        data-testid="create-frequent-checkbox"
                      />
                      <label :for="`frequent-${person.userId}`" class="form-check-label text-break">
                        <span class="fw-bold">{{ person.name }}</span>
                        <span class="d-block small text-muted">{{
                          sharedLabel(person.count)
                        }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </fieldset>

              <div v-if="errorMessage" class="alert alert-danger" data-testid="create-error">
                {{ errorMessage }}
              </div>

              <button
                type="submit"
                class="app-btn app-btn-lg btn-sign w-100 mt-2"
                :disabled="isSaving"
                data-testid="create-submit"
              >
                {{ isSaving ? 'Creating...' : 'Create Meetup' }}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <aside class="app-ticket text-start" aria-label="Preview of your meetup">
          <span class="app-label">Preview</span>
          <p class="preview-title app-doto mt-2 mb-3">{{ previewOccasion }}</p>
          <div class="d-flex justify-content-between gap-3 mb-2">
            <span class="fw-bold">Date</span><span>{{ date ? formatDate(date) : 'Not set' }}</span>
          </div>
          <div class="d-flex justify-content-between gap-3">
            <span class="fw-bold">Time</span><span>{{ time || 'Not set' }}</span>
          </div>
        </aside>
      </div>
    </div>
    <!-- Once the meetup exists: its code to share and a button to the lobby -->
    <div v-else class="row justify-content-center">
      <div class="col-md-8 col-lg-6">
        <div class="card app-card" data-testid="create-result">
          <div class="card-body p-4">
            <h2 class="h3 app-heading mb-3">Meetup created</h2>
            <div class="app-ticket mb-4">
              <span class="app-label">Share this code with your group</span>
              <span class="app-code mt-2" data-testid="create-code">{{ meetup.code }}</span>
              <span class="d-block mt-2"
                >{{ meetup.occasion }}, {{ formatDate(meetup.date) }}, {{ meetup.time }}</span
              >
            </div>
            <p v-if="addedNames" class="mb-4" data-testid="create-added">
              Added {{ addedNames }}. They'll find it in My Meetups.
            </p>
            <div class="d-flex flex-wrap gap-3">
              <button
                type="button"
                class="app-btn app-btn-lg btn-quiet flex-fill"
                @click="copyCode"
                data-testid="create-copy"
              >
                {{ copyLabel }}
              </button>
              <button
                @click="goToMeetup"
                class="app-btn app-btn-lg btn-sign flex-fill"
                data-testid="create-go-to-meetup"
              >
                Go to meetup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-title {
  font-size: 30px;
  line-height: 1.1;
  overflow-wrap: anywhere;
}
</style>
