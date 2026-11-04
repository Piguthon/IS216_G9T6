<!--
  FILE:     src/components/AppNavbar.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Responsive top navigation
  PROPS:    none
  EMITS:    none
  TALKS TO: RouterLinks
  DATA:     none
  REVISE:   Wk 3 navbar, collapse · Wk 4 RouterLink
-->
<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

// Small screens: the hamburger opens and closes the menu. Clicking a link, or anywhere
// outside the navbar (the backdrop below), closes it again.
const isMenuOpen = ref(false)
</script>

<!-- Responsive Bootstrap 5 navbar (https://getbootstrap.com/docs/5.3/components/navbar/) -->
<template>
  <!-- Transparent layer behind the navbar that catches a tap outside the open menu -->
  <div v-if="isMenuOpen" class="nav-backdrop" aria-hidden="true" @click="isMenuOpen = false"></div>

  <nav
    class="navbar navbar-expand-lg app-bar app-navbar"
    data-bs-theme="dark"
    data-testid="app-navbar"
  >
    <div class="container">
      <RouterLink
        class="navbar-brand app-logo"
        :to="{ name: 'home' }"
        data-testid="nav-brand"
        @click="isMenuOpen = false"
      >
        FairSpot
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        aria-controls="mainNavbar"
        :aria-expanded="isMenuOpen"
        aria-label="Toggle navigation"
        data-testid="nav-toggler"
        @click="isMenuOpen = !isMenuOpen"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="mainNavbar" class="collapse navbar-collapse" :class="{ show: isMenuOpen }">
        <ul class="navbar-nav me-auto small">
          <li class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'home' }"
              data-testid="nav-home"
              @click="isMenuOpen = false"
            >
              Home
            </RouterLink>
          </li>
          <li v-if="auth.isLoggedIn" class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'meetups' }"
              data-testid="nav-meetups"
              @click="isMenuOpen = false"
            >
              My Meetups
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'create-meetup' }"
              data-testid="nav-create"
              @click="isMenuOpen = false"
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
              @click="isMenuOpen = false"
            >
              Join Meetup
            </RouterLink>
          </li>
        </ul>
        <ul class="navbar-nav align-items-lg-center gap-lg-2 small">
          <template v-if="!auth.isLoggedIn">
            <li class="nav-item">
              <RouterLink
                exact-active-class="active"
                class="nav-link text-uppercase fw-bold"
                to="/login"
                data-testid="nav-login"
                @click="isMenuOpen = false"
              >
                Log in
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                class="app-btn btn-quiet app-btn-sm text-uppercase my-2 my-lg-0"
                to="/signup"
                data-testid="nav-signup"
                @click="isMenuOpen = false"
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
                @click="isMenuOpen = false"
              >
                Profile
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink
                exact-active-class="active"
                class="nav-link text-uppercase fw-bold"
                to="/logout"
                data-testid="nav-logout"
                @click="isMenuOpen = false"
              >
                Log out
              </RouterLink>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Covers the page while the menu is open, just under the navbar (1020) */
.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1019;
}

/* Tablets: the navbar isn't sticky here, so lift it above the backdrop */
@media (min-width: 768px) and (max-width: 991.98px) {
  .app-navbar {
    position: relative;
    z-index: 1020;
  }
}

/* lg and up: the menu is always shown, so the backdrop is never needed */
@media (min-width: 992px) {
  .nav-backdrop {
    display: none;
  }
}
</style>
