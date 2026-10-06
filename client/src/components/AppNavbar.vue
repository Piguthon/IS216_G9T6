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
// TODO (P4)
</script>

<!-- Responsive Bootstrap 5 navbar (https://getbootstrap.com/docs/5.3/components/navbar/) -->
<template>
  <nav class="navbar navbar-expand-md navbar-dark bg-primary" data-testid="app-navbar">
    <div class="container">
      <RouterLink class="navbar-brand" :to="{ name: 'home' }" data-testid="nav-brand">
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
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'home' }" data-testid="nav-home">
              Home
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'create-meetup' }" data-testid="nav-create">
              Create Meetup
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'join-meetup' }" data-testid="nav-join">
              Join Meetup
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'login' }" data-testid="nav-login">
              Log in
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
