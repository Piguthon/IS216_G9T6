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
import { ref } from 'vue';
import axios from 'axios';

defineProps({
  placeholder: {
    type: String,
    default: 'Search address or postal code...'
  }
});

const emit = defineEmits(['select']);

const query = ref('');
const results = ref([]);
const hasSearched = ref(false);

async function search() {
  if (!query.value.trim()) {
    results.value = [];
    hasSearched.value = false;
    return;
  }

  try {
    const response = await axios.get('https://www.onemap.gov.sg/api/common/elastic/search', {
      params: {
        searchVal: query.value,
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: 1
      }
    });

    results.value = response.data.results.map(r => ({
      label: r.SEARCHVAL,
      postal: r.POSTAL !== 'NIL' ? r.POSTAL : '',
      lat: Number(r.LATITUDE),
      lng: Number(r.LONGITUDE)
    }));
    hasSearched.value = true;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    results.value = [];
  }
}

function handleSelect(result) {
  emit('select', result);
  query.value = result.label;
  results.value = [];
  hasSearched.value = false;
}
</script>

<template>
  <div data-testid="address-search" class="position-relative">
    <div class="input-group">
      <input
        type="text"
        class="form-control"
        v-model="query"
        @keyup.enter="search"
        :placeholder="placeholder"
        data-testid="address-input"
      />
      <button 
        class="btn btn-primary" 
        type="button" 
        @click="search"
        data-testid="address-search-btn"
      >
        Search
      </button>
    </div>

    <ul v-if="results.length > 0" class="list-group position-absolute w-100 mt-1 shadow-sm" style="z-index: 1050;">
      <li
        v-for="(result, index) in results"
        :key="index"
        class="list-group-item list-group-item-action"
        @click="handleSelect(result)"
        style="cursor: pointer;"
        data-testid="address-suggestion"
      >
        <span class="fw-medium">{{ result.label }}</span>
        <span v-if="result.postal" class="text-muted small ms-2">
          S({{ result.postal }})
        </span>
      </li>
    </ul>

    <ul v-else-if="hasSearched && query.trim() !== ''" class="list-group position-absolute w-100 mt-1 shadow-sm" style="z-index: 1050;">
      <li class="list-group-item text-muted" data-testid="address-no-results">
        No results found.
      </li>
    </ul>
  </div>
</template>