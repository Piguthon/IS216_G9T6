<!--
  FILE:     src/components/AppNavbar.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Responsive top navigation
  PROPS:    none
  EMITS:    none
  TALKS TO: RouterLinks
  DATA:     none
  REVISE:   Wk 3 navbar, collapse · Wk 4 RouterLink
  DONE WHEN:
    - [ ] links: Home, Create Meetup, Join Meetup, Log in
    - [ ] collapses on phones
-->
<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const logoutMessage = ref('')
const isLoggingOut = ref(false)

async function handleLogout() {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  logoutMessage.value = ''
  try {
    await auth.logout()
    router.push('/login')
  } catch {
    logoutMessage.value = 'Logout failed. Please try again.'
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<!-- Responsive Bootstrap 5 navbar (https://getbootstrap.com/docs/5.3/components/navbar/) -->
<template>
  <nav
    class="navbar navbar-expand-md app-bar app-navbar"
    data-bs-theme="dark"
    data-testid="app-navbar"
  >
    <div class="container">
      <RouterLink class="navbar-brand app-logo" :to="{ name: 'home' }" data-testid="nav-brand">
        <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
          <path d="M7 0C3.1 0 0 3 0 6.9 0 12 7 18 7 18s7-6 7-11.1C14 3 10.9 0 7 0Z" fill="#fff" />
          <circle cx="7" cy="7" r="2.6" fill="#1d4f91" />
        </svg>
        FairSpot
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNavbar"
        aria-controls="mainNavbar"
        aria-expanded="false"
        aria-label="Toggle navigation"
        data-testid="nav-toggler"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="mainNavbar" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto small">
          <li class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'home' }"
              data-testid="nav-home"
            >
              Home
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'create-meetup' }"
              data-testid="nav-create"
            >
              Create Meetup
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'join-meetup' }"
              data-testid="nav-join"
            >
              Join Meetup
            </RouterLink>
          </li>
        </ul>
        <ul class="navbar-nav align-items-md-center gap-md-2 small">
          <template v-if="!auth.isLoggedIn">
            <li class="nav-item">
              <RouterLink
                exact-active-class="active"
                class="nav-link text-uppercase fw-bold"
                to="/login"
                data-testid="nav-login"
              >
                Log in
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="app-btn btn-quiet app-btn-sm text-uppercase my-2 my-md-0"
                to="/signup"
                data-testid="nav-signup"
              >
                Sign up
              </RouterLink>
            </li>
          </template>

          <template v-else>
            <li class="nav-item">
              <RouterLink
                exact-active-class="active"
                class="nav-link text-uppercase fw-bold"
                to="/profile"
                data-testid="nav-profile"
              >
                Profile
              </RouterLink>
            </li>
            <li class="nav-item">
              <a
                href="#"
                class="nav-link text-uppercase fw-bold"
                @click.prevent="handleLogout"
                data-testid="nav-logout"
              >
                Log out
              </a>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
  <p v-if="logoutMessage" class="alert alert-danger container mt-2" role="alert">
    {{ logoutMessage }}
  </p>
</template>
