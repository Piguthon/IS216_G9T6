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
    message.value = `Welcome back, ${response.data.user.name}!`
    password.value = ''
    router.push('/');
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
  <section data-testid="login-page">
    <h1 class="h3">Log in</h1>
    <p class="text-muted">Welcome back to FairSpot.</p>

    <form @submit.prevent="submitLogin">
      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          class="form-control"
          placeholder="Enter your email"
          autocomplete="username"
          required
        />
      </div>

      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="form-control"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
        />
      </div>

      <p v-if="message" class="alert alert-info" role="status">
        {{ message }}
      </p>

      <button
        type="submit"
        class="btn btn-primary w-100"
        :disabled="isLoggingIn"
      >
        {{ isLoggingIn ? 'Logging in…' : 'Log in' }}
      </button>
    </form>
  </section>
</template>

