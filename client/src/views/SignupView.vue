<!--
  FILE:     src/views/SignupView.vue
  OWNER:    JX
  PURPOSE:  Create an account
  ROUTE:    /signup
  TALKS TO: POST /api/users/signup
  DATA:     sends { name, email, password } → receives { token, user }
  REVISE:   Wk 3 forms · Wk 5 Axios POST
  DONE WHEN:
    - [ ] validation messages
    - [ ] redirect after sign-up
    - [ ] responsive
-->
<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'

const name = ref('')
const email = ref('')
const password = ref('')
const message = ref('')

async function submitSignup() {
  message.value = ''

  try {
    const response = await axios.post(`${BASE_URL}/users/signup`, {
      name: name.value,
      email: email.value,
      password: password.value,
    })

    message.value = `Account created for ${response.data.user.name}!`
    password.value = ''
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      message.value = error.response.data.error
    } else {
      message.value = 'Unable to create your account. Check that the server is running.'
    }
  }
}
</script>

<template>
  <section class="signup-page" data-testid="signup-page">
    <h1 class="h3">Sign up</h1>
    <p class="text-muted">Create your FairSpot account to save your locations.</p>

    <form @submit.prevent="submitSignup">
      <div class="mb-3">
        <label for="name" class="form-label">Name</label>
        <input
          id="name"
          v-model.trim="name"
          type="text"
          class="form-control"
          placeholder="Enter your name"
          autocomplete="name"
          required
        />
      </div>

      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          class="form-control"
          placeholder="Enter your email"
          autocomplete="email"
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
          autocomplete="new-password"
          required
        />
      </div>

      <p v-if="message" class="alert alert-info" role="status">
        {{ message }}
      </p>

      <button type="submit" class="btn btn-primary w-100">Create account</button>
    </form>
  </section>
</template>

<style scoped>
.signup-page {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}
</style>
