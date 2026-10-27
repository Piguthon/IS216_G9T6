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
// Example group for the hero: travel times to Bishan MRT from four corners of Singapore.
// Illustrative numbers only; the real ranking comes from the results page.
const exampleTrips = [
  { name: 'Aisha', from: 'Tampines', minutes: 34 },
  { name: 'Wei Jie', from: 'Jurong East', minutes: 32 },
  { name: 'Priya', from: 'Woodlands', minutes: 27 },
  { name: 'Marcus', from: 'Punggol', minutes: 29 },
]
const longest = Math.max(...exampleTrips.map((t) => t.minutes))
const scaleMinutes = 45 // bar width is minutes / scaleMinutes

const steps = [
  {
    title: 'Create a meetup',
    text: 'Pick the occasion, date and time. You get a six-letter code.',
  },
  { title: 'Share the code', text: 'Everyone joins and adds where they are starting from.' },
  {
    title: 'Pick a fair spot',
    text: 'Stations are ranked by the longest trip in the group. Vote, then find a place to eat nearby.',
  },
]
</script>

<template>
  <section data-testid="home-page">
    <!-- Hero: text on the left, example board on the right (stacked on phones) -->
    <div class="app-halftone rounded-5 p-4 p-lg-5">
      <div class="row align-items-center g-5">
        <div class="col-lg-7">
          <h1 class="display-1 app-heading app-on-dark mb-4" data-testid="home-heading">
            <span class="visually-hidden">FairSpot: </span>Nobody gets the long ride.
          </h1>
          <p class="lead app-on-dark-muted mb-4">
            FairSpot finds the MRT station where the longest journey in your group is as short as it
            can be, so everyone travels about the same.
          </p>
          <div class="d-grid gap-2 d-sm-flex">
            <RouterLink
              class="app-btn btn-bright app-btn-lg"
              :to="{ name: 'create-meetup' }"
              data-testid="home-create-link"
            >
              Create Meetup
            </RouterLink>
            <RouterLink
              class="app-btn btn-quiet app-btn-lg"
              :to="{ name: 'join-meetup' }"
              data-testid="home-join-link"
            >
              Join with a code
            </RouterLink>
          </div>
        </div>

        <div class="col-lg-5">
          <figure class="card app-card card-body p-4 mb-0" aria-labelledby="home-board-caption">
            <p class="h2 app-heading border-bottom border-3 border-dark pb-3 mb-3">
              Bishan <span class="text-teal">MRT</span>
            </p>
            <ul class="list-unstyled mb-0">
              <li v-for="trip in exampleTrips" :key="trip.name" class="mb-3">
                <div class="d-flex justify-content-between align-items-end mb-1">
                  <span>
                    <strong>{{ trip.name }}</strong>
                    <span class="small text-muted ms-1">from {{ trip.from }}</span>
                  </span>
                  <strong class="h5 app-heading mb-0">{{ trip.minutes }} min</strong>
                </div>
                <div class="progress" aria-hidden="true">
                  <div
                    class="progress-bar"
                    :class="trip.minutes === longest ? 'bg-black' : 'bg-teal'"
                    :style="{ width: (trip.minutes / scaleMinutes) * 100 + '%' }"
                  ></div>
                </div>
              </li>
            </ul>
            <figcaption id="home-board-caption" class="small text-muted mt-2">
              Example: four friends meeting for dinner. The longest trip is {{ longest }} minutes.
            </figcaption>
          </figure>
        </div>
      </div>
    </div>

    <!-- How it works: three cards side by side from md, stacked on phones -->
    <section class="mt-5" aria-labelledby="home-steps-title">
      <h2 id="home-steps-title" class="display-5 app-heading mb-4">How it works</h2>
      <ol class="row g-3 list-unstyled">
        <li v-for="(step, i) in steps" :key="step.title" class="col-md-4">
          <div class="card app-card card-body h-100 d-flex flex-row gap-3 p-4">
            <span class="display-4 app-heading text-teal" aria-hidden="true">{{ i + 1 }}</span>
            <div>
              <h3 class="h4 app-heading mb-2">{{ step.title }}</h3>
              <p class="text-muted mb-0">{{ step.text }}</p>
            </div>
          </div>
        </li>
      </ol>
    </section>
  </section>
</template>
