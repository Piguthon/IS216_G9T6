<!--
  FILE:     src/components/AddressSearch.vue
  OWNER:    P1 (team-written)
  PURPOSE:  Address / postal code input with OneMap autocomplete suggestions
  PROPS:    placeholder (String)
  EMITS:    select with { label, postal, lat, lng }
  TALKS TO: OneMap Search https://www.onemap.gov.sg/api/common/elastic/search directly from the browser
            if the browser blocks it, our own GET /api/places/search?q= (P1 checks on Thu 8 Oct)
  DATA:     OneMap returns LATITUDE/LONGITUDE as strings
  REVISE:   Wk 5 input/keyup events, Axios GET with params, v-for
  DONE WHEN:
    - [ ] suggestions while typing
    - [ ] choosing one emits select
    - [ ] postal codes work
    - [ ] "no results" message
    - [ ] testids on input and suggestions
-->
<script setup>
// TODO (P1)
</script>

<template>
  <div data-testid="address-search">
    <!-- TODO (P1): build this component -->
  </div>
</template>
