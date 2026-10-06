<!--
  FILE:     src/views/HomeView.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Landing page: the problem in one line, how FairSpot works, buttons to create or join
  ROUTE:    /
  TALKS TO: links to /create, /join
  DATA:     none
  REVISE:   Wk 3 grid, cards, buttons · Wk 4 RouterLink
  DONE WHEN:
    - [ ] short "how it works" section
    - [ ] create/join buttons
    - [ ] responsive 375px→XL
    - [ ] keep testids home-page, home-heading
-->
<script setup>
// TODO (P4)
</script>

<template>
  <section class="text-center py-5" data-testid="home-page">
    <h1 class="display-5 fw-bold" data-testid="home-heading">FairSpot</h1>
    <p class="lead text-muted mx-auto" style="max-width: 36rem">
      Find the fairest public-transport meeting point for your group in Singapore.
    </p>

    <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mt-4">
      <RouterLink
        class="btn btn-primary btn-lg"
        :to="{ name: 'create-meetup' }"
        data-testid="home-create-link"
      >
        Create Meetup
      </RouterLink>
      <RouterLink
        class="btn btn-outline-primary btn-lg"
        :to="{ name: 'join-meetup' }"
        data-testid="home-join-link"
      >
        Join Meetup
      </RouterLink>
    </div>
  </section>
</template>
