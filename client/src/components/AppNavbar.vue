<!-- Responsive top navigation. -->
<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const isMenuOpen = ref(false)
</script>

<template>
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
.nav-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1019;
}

@media (min-width: 768px) and (max-width: 991.98px) {
  .app-navbar {
    position: relative;
    z-index: 1020;
  }
}

@media (min-width: 992px) {
  .nav-backdrop {
    display: none;
  }
}
</style>
