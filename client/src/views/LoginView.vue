<!--
  FILE:     src/views/LoginView.vue
  OWNER:    P1 (after the pitch) (team-written)
  PURPOSE:  Log in for optional account features
  ROUTE:    /login
  TALKS TO: POST /api/users/login
  DATA:     sends { email, password } → receives { token, user }
            token kept in localStorage (decision D5)
  REVISE:   Wk 5 Axios POST + headers · Wk 6 localStorage
  DONE WHEN:
    - [ ] error message on bad login
    - [ ] redirect after login
    - [ ] responsive
-->
<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const message = ref('')
const isLoggingIn = ref(false)

async function submitLogin() {
  if (isLoggingIn.value) return

  message.value = ''
  isLoggingIn.value = true

  try {
    const response = await axios.post(`${BASE_URL}/users/login`, {
      email: email.value,
      password: password.value,
    })

    auth.login(response.data.token)
    password.value = ''
    router.push('/')
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      message.value = error.response.data.error
    } else {
      message.value = 'Unable to log in. Check that the server is running.'
    }
  } finally {
    isLoggingIn.value = false
  }
}
</script>

<template>
  <div class="row justify-content-center">
    <section class="col-md-8 col-lg-6" data-testid="login-page">
      <header class="app-page-header">
        <h1 class="display-5 app-heading mb-3">Log in</h1>
        <p class="text-muted mb-0">
          Log in to use your saved starting points and favourite places.
        </p>
      </header>

      <form class="card app-card card-body" @submit.prevent="submitLogin">
        <div class="mb-3">
          <label for="email" class="form-label fw-bold">Email</label>
          <input
            id="email"
            v-model.trim="email"
            type="email"
            class="form-control app-input"
            placeholder="Enter your email"
            autocomplete="username"
            required
          />
        </div>

        <div class="mb-3">
          <label for="password" class="form-label fw-bold">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control app-input"
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="message" class="alert alert-danger" role="alert">
          {{ message }}
        </p>

        <button type="submit" class="app-btn btn-teal w-100" :disabled="isLoggingIn">
          {{ isLoggingIn ? 'Logging in…' : 'Log in' }}
        </button>
      </form>
      <p class="mt-3 text-center">No account yet? <RouterLink to="/signup">Sign up</RouterLink></p>
    </section>
  </div>
</template>
