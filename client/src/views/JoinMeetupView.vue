<!--
  FILE:     src/views/JoinMeetupView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  A friend joins with the meetup code and their name (no account needed)
  ROUTE:    /join
  TALKS TO: GET /api/meetups/:code, POST /api/meetups/:code/members
  DATA:     sends { name } → receives { _id, name, start: null, memberToken }; a guest who uses
            the same name again gets their existing member back, but only from the browser that
            still has their memberToken (otherwise 409: choose another name)
            this member's _id and memberToken are remembered in localStorage
            (fairspot-member-<code>, fairspot-member-token-<code>) so the lobby knows who "you" are
  REVISE:   Wk 5 Axios GET/POST · Wk 6 localStorage
  DONE WHEN:
    - [ ] unknown-code message
    - [ ] successful join goes to /meetup/:code
    - [ ] a guest who closed the tab gets back in with the same code and name
    - [ ] responsive
    - [ ] testids
-->
<script setup>
// STEPS (script: TODO 1-3 · template: TODO 4-5)
// Build this view after Create + Lobby work.

// TODO 1: Same imports as Create (src/views/CreateMeetupView.vue, TODO 1).
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { memberAuthConfig } from '../utils/member-auth'

const router = useRouter()
const auth = useAuthStore()
// TODO 2: Refs for the code, name, error message and "is joining".
const code = ref('')
const name = ref('')
const errorMessage = ref('')
const isJoining = ref(false)
// TODO 3: async function joinMeetup()
//           - both fields required
//           - normalise the code (e.g. uppercase)
//           - axios.post to ${BASE_URL}/meetups/<code>/members with { name }, inside try/catch
//           - 404 → "No meetup with that code"
//           - on success, save the new member _id in localStorage (fairspot-member-<code>)
//             and open /meetup/<code>
async function joinMeetup() {
  if (isJoining.value) return
  errorMessage.value = ''

  if (!code.value || (!auth.isLoggedIn && !name.value.trim())) {
    errorMessage.value = 'Please fill out all fields to join the meetup.'
    return
  }
  // Normalise the code to uppercase as standard
  const normalizedCode = code.value.toUpperCase()
  isJoining.value = true

  try {
    let memberName = name.value.trim()
    if (auth.isLoggedIn) {
      const profile = await axios.get(`${BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      memberName = profile.data.user.name
    }
    const response = await axios.post(
      `${BASE_URL}/meetups/${normalizedCode}/members`,
      {
        name: memberName,
      },
      // A guest rejoining under the same name proves it's them with the saved memberToken
      memberAuthConfig(normalizedCode, auth.token),
    )

    // Save the new member _id in localStorage, and their secret if this is a new member
    // (the server only sends memberToken once, when the member is created)
    const newMemberId = response.data._id
    localStorage.setItem(`fairspot-member-${normalizedCode}`, newMemberId)
    if (response.data.memberToken) {
      localStorage.setItem(`fairspot-member-token-${normalizedCode}`, response.data.memberToken)
    }

    // Navigate directly to the lobby
    router.push(`/meetup/${normalizedCode}`)
  } catch (error) {
    if (error.response && error.response.status === 401) {
      auth.clearSession()
      errorMessage.value = 'Your session is invalid. Please log in again or enter a guest name.'
    } else if (error.response && error.response.status === 404) {
      errorMessage.value = 'No meetup with that code was found.'
    } else if (error.response && error.response.data && error.response.data.error) {
      errorMessage.value = error.response.data.error
    } else {
      errorMessage.value = 'Failed to join meetup. Please try again.'
    }
    isJoining.value = false
  }
}
</script>

<template>
  <div class="row justify-content-center align-items-center flex-grow-1 pt-3">
    <section class="col-md-8 col-lg-6" data-testid="join-meetup-page">
      <!-- TODO 4: Header + form card + error alert, as in Create. -->
      <div class="card app-card">
        <div class="card-body p-4">
          <header class="app-page-header">
            <h1 class="app-heading mb-0">Join Meetup</h1>
          </header>
          <form @submit.prevent="joinMeetup">
            <div class="app-ticket mb-3">
              <label for="code" class="app-label">Meetup Code</label>
              <input
                type="text"
                id="code"
                class="app-code join-code mt-2"
                v-model.trim="code"
                maxlength="6"
                autocomplete="off"
                spellcheck="false"
                data-testid="join-code"
                placeholder="ABCDEF"
              />
            </div>
            <div v-if="!auth.isLoggedIn" class="mb-3">
              <label for="name" class="form-label fw-bold">Your Name</label>
              <input
                type="text"
                id="name"
                class="form-control app-input"
                v-model.trim="name"
                data-testid="join-name"
                placeholder="What should we call you?"
                aria-describedby="name-help"
              />
              <p id="name-help" class="form-text mb-0">
                Closed the tab? Join again with the same code and name to get back in.
              </p>
            </div>
            <div v-if="errorMessage" class="alert alert-danger" data-testid="join-error">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              class="app-btn app-btn-lg btn-sign w-100 mt-2"
              :disabled="isJoining"
              data-testid="join-submit"
            >
              {{ isJoining ? 'Joining...' : 'Join Meetup' }}
            </button>
            <p class="text-center mt-3 mb-0">
              Hosting instead? <RouterLink to="/create">Create a meetup</RouterLink>
            </p>
          </form>
        </div>
      </div>
      <!-- TODO 5: testids: join-code, join-name, join-submit, join-error -->
    </section>
  </div>
</template>

<style scoped>
/* The code is typed straight onto the LED board */
.join-code {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: center;
}

.join-code:focus {
  outline: 2px solid #f2c230;
  outline-offset: 4px;
}

.join-code::placeholder {
  color: #8a7a3f;
  opacity: 1;
}
</style>
