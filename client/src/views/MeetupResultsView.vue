<!--
  FILE:     src/views/MeetupResultsView.vue
  OWNER:    P3 (page owner; places P2's MapView + VenueList and P4's VotePanel inside) (team-written)
  PURPOSE:  Shows candidate meeting points ranked fairest first, with each member's travel time
  ROUTE:    /meetup/:code/results
  TALKS TO: GET /api/ranking/:code
            uses MeetingPointCard, MapView, VenueList, VotePanel
  DATA:     Ranking [ { stationId, name, lat, lng, times: [ { memberId, name, minutes } ],
                        longestMinutes, totalMinutes } ]   (fairest first)
  REVISE:   Wk 5 onMounted, Axios GET, computed, v-for · Wk 6 props/emits
  DONE WHEN:
    - [ ] loading state (ranking can take several seconds)
    - [ ] ranked cards with each member's minutes and the longest journey highlighted
    - [ ] selecting a point updates the map and venues
    - [ ] error state
    - [ ] responsive (stacked on phones)
-->
<script setup>
// TODO (P3)
</script>

<template>
  <section data-testid="meetup-results-page">
    <h1 class="h3">Meetup Results</h1>
    <!-- TODO (P3): build this screen -->
  </section>
</template>
