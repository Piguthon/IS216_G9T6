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
import { ref, computed } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmation = ref(false)
const passwordRules = computed(() => [
  { label: 'At least 8 characters', met: password.value.length >= 8 },
  { label: 'One uppercase letter', met: /[A-Z]/.test(password.value) },
  { label: 'One lowercase letter', met: /[a-z]/.test(password.value) },
  { label: 'One digit', met: /[0-9]/.test(password.value) },
  { label: 'One symbol (e.g. !, @, #)', met: /[^A-Za-z0-9\s]/.test(password.value) },
])
const passwordValid = computed(() => passwordRules.value.every((rule) => rule.met))
const passwordsMatch = computed(
  () => confirmPassword.value !== '' && password.value === confirmPassword.value,
)
const message = ref('')
const isSigningUp = ref(false)

async function submitSignup() {
  if (isSigningUp.value) return
  message.value = ''
  if (!passwordValid.value) {
    message.value =
      'Use at least 8 characters with an uppercase letter, lowercase letter, digit and symbol.'
    return
  }
  if (!passwordsMatch.value) {
    message.value = 'Passwords do not match. Please re-enter your password.'
    return
  }
  isSigningUp.value = true

  try {
    const response = await axios.post(`${BASE_URL}/users/signup`, {
      name: name.value,
      email: email.value,
      password: password.value,
    })

    auth.login(response.data.token)
    password.value = ''
    confirmPassword.value = ''
    showPassword.value = false
    showConfirmation.value = false
    router.push('/profile')
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      message.value = error.response.data.error
    } else {
      message.value = 'Unable to create your account. Check that the server is running.'
    }
  } finally {
    isSigningUp.value = false
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
        <div class="input-group">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control"
            placeholder="Enter your password"
            autocomplete="new-password"
            minlength="8"
            aria-describedby="password-rules"
            required
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            :aria-pressed="showPassword"
            aria-controls="password"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <ul id="password-rules" class="list-unstyled small mt-2 mb-0">
          <li
            v-for="rule in passwordRules"
            :key="rule.label"
            :class="rule.met ? 'text-success' : 'text-muted'"
          >
            {{ rule.met ? '✓' : '○' }} {{ rule.label }}
            <span class="visually-hidden">{{ rule.met ? ': met' : ': not met' }}</span>
          </li>
        </ul>
      </div>

      <div class="mb-3">
        <label for="confirm-password" class="form-label">Confirm password</label>
        <div class="input-group">
          <input
            id="confirm-password"
            v-model="confirmPassword"
            :type="showConfirmation ? 'text' : 'password'"
            class="form-control"
            :class="{
              'is-invalid': confirmPassword && !passwordsMatch,
              'is-valid': passwordsMatch,
            }"
            :aria-invalid="confirmPassword !== '' && !passwordsMatch"
            aria-describedby="password-match"
            autocomplete="new-password"
            placeholder="Re-enter your password"
            required
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            :aria-pressed="showConfirmation"
            aria-controls="confirm-password"
            :aria-label="showConfirmation ? 'Hide confirmed password' : 'Show confirmed password'"
            @click="showConfirmation = !showConfirmation"
          >
            {{ showConfirmation ? 'Hide' : 'Show' }}
          </button>
        </div>
        <p
          id="password-match"
          class="small mt-2 mb-0"
          role="status"
          :class="passwordsMatch ? 'text-success' : 'text-danger'"
        >
          {{
            confirmPassword ? (passwordsMatch ? 'Passwords match.' : 'Passwords do not match.') : ''
          }}
        </p>
      </div>

      <p v-if="message" class="alert alert-danger" role="alert">
        {{ message }}
      </p>

      <button
        type="submit"
        class="btn btn-primary w-100"
        :disabled="isSigningUp || !passwordValid || !passwordsMatch"
      >
        {{ isSigningUp ? 'Creating account...' : 'Create account' }}
      </button>
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
