<!--
  FILE:     src/views/SummaryView.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Final plan: meeting point, venue, date/time, each member's route, live bus arrival
  ROUTE:    /meetup/:code/summary
  TALKS TO: GET /api/meetups/:code
            uses BusArrivalCard
  DATA:     Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  REVISE:   Wk 3 cards, list group · Wk 5 onMounted + Axios · Wk 6 props
  DONE WHEN:
    - [ ] all plan details shown
    - [ ] a working bus-arrival card
    - [ ] anything still sample data is labelled for the pitch
    - [ ] responsive
-->
<script setup>
// TODO (P4)
</script>

<template>
  <section data-testid="summary-page">
    <h1 class="h3">Summary</h1>
    <!-- TODO (P4): build this screen -->
  </section>
</template>
