<!--
  FILE:     src/views/LogoutView.vue
  OWNER:    P1 (after the pitch) (team-written)
  PURPOSE:  Logs the user out as soon as the page opens, then confirms it
  ROUTE:    /logout
  TALKS TO: POST /api/users/logout, through the auth store
  DATA:     none
-->
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const isLoggingOut = ref(true)
const errorMessage = ref('')

async function logOut() {
  isLoggingOut.value = true
  errorMessage.value = ''
  try {
    await auth.logout()
  } catch {
    errorMessage.value = 'Logout failed. Please try again.'
  }
  isLoggingOut.value = false
}

onMounted(logOut)
</script>

<template>
  <div class="row justify-content-center align-items-center flex-grow-1 pt-3">
    <section class="col-md-8 col-lg-6" data-testid="logout-page">
      <div class="card app-card">
        <div class="card-body p-4 text-center">
          <p v-if="isLoggingOut" class="mb-0" role="status" data-testid="logout-loading">
            Logging out…
          </p>

          <template v-else-if="errorMessage">
            <p class="alert alert-danger" role="alert" data-testid="logout-error">
              {{ errorMessage }}
            </p>
            <button type="button" class="app-btn btn-sign" @click="logOut">Try again</button>
          </template>

          <template v-else>
            <h1 class="app-heading mb-3" data-testid="logout-heading">Logged out</h1>
            <p>You have logged out of FairSpot.</p>
            <div class="d-grid gap-2 d-sm-flex justify-content-sm-center">
              <RouterLink class="app-btn btn-sign" to="/login">Log in</RouterLink>
              <RouterLink class="app-btn btn-quiet" :to="{ name: 'home' }">Go to home</RouterLink>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
