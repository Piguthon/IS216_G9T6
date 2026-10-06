<!--
  FILE:     src/components/BusArrivalCard.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Live next-bus times at a member's first bus stop
  PROPS:    stopCode (String), label (String)
  EMITS:    none
  TALKS TO: GET /api/bus-arrival/:stopCode
  DATA:     Bus { stopCode, services: [ { serviceNo, nextArrivals: [ ISO time strings ] } ] }
            arrival times are ISO strings with +08:00
  REVISE:   Wk 5 onMounted + Axios GET, computed
  DONE WHEN:
    - [ ] shows each service's next arrivals in minutes
    - [ ] refresh button
    - [ ] empty state when buses aren't running (late night)
-->
<script setup>
// TODO (P4)
</script>

<template>
  <div data-testid="bus-arrival-card">
    <!-- TODO (P4): build this component -->
  </div>
</template>
