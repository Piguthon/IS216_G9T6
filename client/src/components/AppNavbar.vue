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
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
</script>

<!-- Responsive Bootstrap 5 navbar (https://getbootstrap.com/docs/5.3/components/navbar/) -->
<template>
  <nav
    class="navbar navbar-expand-lg app-bar app-navbar"
    data-bs-theme="dark"
    data-testid="app-navbar"
  >
    <div class="container">
      <RouterLink class="navbar-brand app-logo" :to="{ name: 'home' }" data-testid="nav-brand">
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
          <li v-if="auth.isLoggedIn" class="nav-item">
            <RouterLink
              exact-active-class="active"
              class="nav-link text-uppercase fw-bold"
              :to="{ name: 'meetups' }"
              data-testid="nav-meetups"
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
        <ul class="navbar-nav align-items-lg-center gap-lg-2 small">
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
                class="app-btn btn-quiet app-btn-sm text-uppercase my-2 my-lg-0"
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
              <RouterLink
                exact-active-class="active"
                class="nav-link text-uppercase fw-bold"
                to="/logout"
                data-testid="nav-logout"
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
