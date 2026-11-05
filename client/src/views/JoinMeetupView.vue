<!-- A friend joins with the meetup code and their name (no account needed). -->
<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'
import { memberAuthConfig } from '../utils/member-auth'

const router = useRouter()
const auth = useAuthStore()
const code = ref('')
const name = ref('')
const errorMessage = ref('')
const isJoining = ref(false)

// Joins with the code, remembers the new member in localStorage and opens the lobby
async function joinMeetup() {
  if (isJoining.value) return
  errorMessage.value = ''

  if (!code.value || (!auth.isLoggedIn && !name.value.trim())) {
    errorMessage.value = 'Please fill out all fields to join the meetup.'
    return
  }
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
      memberAuthConfig(normalizedCode, auth.token),
    )

    const newMemberId = response.data._id
    localStorage.setItem(`fairspot-member-${normalizedCode}`, newMemberId)
    if (response.data.memberToken) {
      localStorage.setItem(`fairspot-member-token-${normalizedCode}`, response.data.memberToken)
    }

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
    </section>
  </div>
</template>

<style scoped>
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
