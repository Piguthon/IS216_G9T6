<!--
  FILE:     src/views/CreateMeetupView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  Host creates a meetup and gets a shareable code
  ROUTE:    /create
  TALKS TO: POST /api/meetups
  DATA:     sends { hostName, occasion, date, time } → receives Meetup
            Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  REVISE:   Wk 4 v-model, useRouter().push · Wk 5 Axios POST, async/await, try/catch, v-model modifiers
  DONE WHEN:
    - [ ] required fields validated with a message
    - [ ] success shows the code and a "Go to meetup" button to /meetup/:code
    - [ ] error message on failure
    - [ ] responsive
    - [ ] testids on inputs, buttons, result
-->
<script setup>
// STEPS (script: TODO 1-4 · template: TODO 5-9)
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Imports: ref from vue, axios, BASE_URL from ../config.js, useRouter.
//         Example: Week 6/Code_Along/client/src/App.vue (TODOs 1-2)
import { ref } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { todayInSingapore } from '../utils/meetup-date'

const router = useRouter()
const auth = useAuthStore()
const today = ref(todayInSingapore())
// TODO 2: Refs for the four inputs (host name, occasion, date, time), an error message,
//         the created meetup (starts null), and an "is saving" flag.
const occasion = ref('')
const date = ref('')
const time = ref('')
const errorMessage = ref('')
const meetup = ref(null)
const isSaving = ref(false)
// TODO 3: async function createMeetup()
//           - show a message if a required field is empty
//           - otherwise axios.post to ${BASE_URL}/meetups with the four fields, inside try/catch
//           - on success, keep response.data and remember the host's member _id in
//             localStorage under the key fairspot-member-<code>
//           - on failure, show the server's error message if there is one, otherwise a
//             friendly generic one
//         Examples: Week 6/Code_Along/client/src/App.vue (addStudent);
//                   localStorage in Week 6/wk6_example/src/views/Example7View.vue
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
      },
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    meetup.value = response.data
    const code = response.data.code
    const hostId = response.data.members[0]._id
    localStorage.setItem(`fairspot-member-${code}`, hostId)
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
    isSaving.value = false // Added to the catch block
  }
}
function goToMeetup() {
  if (meetup.value && meetup.value.code) {
    router.push(`/meetup/${meetup.value.code}`)
  }
}
// TODO 4: function goToMeetup() uses the router to open /meetup/<code>.
//         Example: Week 4/wk4_example/src/components/Example11.vue
</script>

<template>
  <section data-testid="create-meetup-page">
    <header class="app-page-header mb-3">
      <h1 class="h3">Create Meetup</h1>
    </header>
    <!-- TODO 5: Page header (app-page-header) and a form inside "card app-card", with Bootstrap
                 form controls bound with v-model:
                   - .trim on the text inputs
                   - type="date" and type="time" for date and time
                   - submit with @submit.prevent
                   - button disabled while saving -->
    <div v-if="!meetup" class="card app-card mb-4">
      <div class="card-body">
        <form @submit.prevent="createMeetup">
          <div class="mb-3">
            <label for="occasion" class="form-label">Occasion</label>
            <input
              type="text"
              id="occasion"
              class="form-control"
              v-model.trim="occasion"
              data-testid="create-occasion"
              placeholder="e.g. Dinner, Project Meeting"
            />
          </div>

          <div class="mb-3">
            <label for="date" class="form-label">Date</label>
            <input
              type="date"
              id="date"
              class="form-control"
              v-model="date"
              :min="today"
              data-testid="create-date"
            />
          </div>

          <div class="mb-3">
            <label for="time" class="form-label">Time</label>
            <input
              type="time"
              id="time"
              class="form-control"
              v-model="time"
              data-testid="create-time"
            />
          </div>

          <!-- TODO 6: Error alert (alert alert-danger) shown only when there is a message. -->
          <div v-if="errorMessage" class="alert alert-danger" data-testid="create-error">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100 mt-2"
            :disabled="isSaving"
            data-testid="create-submit"
          >
            {{ isSaving ? 'Creating...' : 'Create Meetup' }}
          </button>
        </form>
      </div>
    </div>
    <!-- TODO 7: Success panel shown once the meetup exists: the code in app-code, a short
                 "share this code" line, and a "Go to meetup" button. -->
    <div v-else class="card app-card text-center" data-testid="create-result">
      <div class="card-body py-5">
        <h2 class="h4 mb-3 text-success">Meetup Created!</h2>
        <p class="text-muted mb-2">Share this code with your group</p>

        <div class="mb-4 app-code" data-testid="create-code">
          {{ meetup.code }}
        </div>

        <button
          @click="goToMeetup"
          class="btn btn-success btn-lg px-4"
          data-testid="create-go-to-meetup"
        >
          Go to meetup
        </button>
      </div>
    </div>
    <!-- TODO 8: Use these testids:
                 create-host-name, create-occasion, create-date, create-time, create-submit,
                 create-error, create-result, create-code, create-go-to-meetup -->

    <!-- TODO 9: Check it at 375px and XL in DevTools. -->
  </section>
</template>
