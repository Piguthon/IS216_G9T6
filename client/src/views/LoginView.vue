<!--
  FILE:     src/views/LoginView.vue
  OWNER:    P1 (team-written)
  PURPOSE:  Log in for optional account features
  ROUTE:    /login
  TALKS TO: POST /api/users/login
  DATA:     sends { email, password } → receives { token, user }
            token kept in localStorage (decision D5)
  REVISE:   Wk 5 Axios POST + headers · Wk 6 localStorage
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
  <div class="row justify-content-center align-items-center flex-grow-1 pt-3">
    <section class="col-md-8 col-lg-6" data-testid="login-page">
      <form class="card app-card card-body p-4" @submit.prevent="submitLogin">
        <header class="app-page-header">
          <h1 class="app-heading mb-0">Log in</h1>
        </header>
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
            data-testid="login-email"
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
            data-testid="login-password"
          />
        </div>

        <p v-if="message" class="alert alert-danger" role="alert" data-testid="login-error">
          {{ message }}
        </p>

        <button
          type="submit"
          class="app-btn app-btn-lg btn-sign w-100"
          :disabled="isLoggingIn"
          data-testid="login-submit"
        >
          {{ isLoggingIn ? 'Logging in…' : 'Log in' }}
        </button>
        <p class="mt-3 mb-0 text-center">
          No account yet? <RouterLink to="/signup">Sign up</RouterLink>
        </p>
      </form>
    </section>
  </div>
</template>
