<!--
  FILE:     src/components/AddressSearch.vue
  OWNER:    P1 (team-written)
  PURPOSE:  Address / postal code input with OneMap autocomplete suggestions
  PROPS:    placeholder (String)
  EMITS:    select with { label, postal, lat, lng }
  TALKS TO: OneMap Search https://www.onemap.gov.sg/api/common/elastic/search directly from the
            browser (no key needed)
  DATA:     OneMap returns LATITUDE/LONGITUDE as strings
  REVISE:   Wk 5 input/keyup events, Axios GET with params, v-for
-->
<script setup>
import { ref } from 'vue'
import axios from 'axios'

defineProps({
  placeholder: {
    type: String,
    default: 'Search address or postal code...',
  },
})

const emit = defineEmits(['select', 'clear'])

const query = ref('')
const results = ref([])
const hasSearched = ref(false)
const isLoading = ref(false)
const message = ref('')
let requestNumber = 0

function handleInput() {
  emit('clear')
  search()
}

async function search() {
  const currentRequest = ++requestNumber
  const searchText = query.value.trim()
  results.value = []
  hasSearched.value = false
  message.value = ''
  isLoading.value = false
  if (searchText.length < 3) return
  isLoading.value = true

  try {
    const response = await axios.get('https://www.onemap.gov.sg/api/common/elastic/search', {
      params: {
        searchVal: searchText,
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: 1,
      },
      timeout: 10000,
    })

    // Only the latest search may update suggestions when responses arrive out of order.
    if (currentRequest !== requestNumber) return
    results.value = response.data.results.map((r) => ({
      label: r.SEARCHVAL,
      postal: r.POSTAL !== 'NIL' ? r.POSTAL : '',
      lat: Number(r.LATITUDE),
      lng: Number(r.LONGITUDE),
    }))
    hasSearched.value = true
  } catch (error) {
    if (currentRequest !== requestNumber) return
    console.error('Error fetching addresses:', error)
    results.value = []
    message.value = 'Unable to search addresses. Press Enter to try again.'
  } finally {
    if (currentRequest === requestNumber) isLoading.value = false
  }
}

function handleSelect(result) {
  requestNumber++
  isLoading.value = false
  message.value = ''
  emit('select', result)
  query.value = result.label
  results.value = []
  hasSearched.value = false
}
</script>

<template>
  <div data-testid="address-search" class="position-relative">
    <input
      type="text"
      class="form-control app-input"
      v-model="query"
      @input="handleInput"
      @keyup.enter="search"
      :placeholder="placeholder"
      data-testid="address-input"
    />
    <p v-if="isLoading" class="small text-muted mt-2 mb-0" role="status">Searching addresses...</p>
    <p v-else-if="message" class="alert alert-danger small mt-2 mb-0" role="alert">{{ message }}</p>
    <p
      v-else-if="query.trim().length > 0 && query.trim().length < 3"
      class="small text-muted mt-2 mb-0"
    >
      Type at least 3 characters to search.
    </p>

    <ul
      v-if="results.length > 0"
      class="list-group position-absolute w-100 mt-1 shadow-sm"
      style="z-index: 1050; max-height: 320px; overflow-y: auto"
    >
      <li v-for="(result, index) in results" :key="index" class="list-group-item p-0">
        <button
          type="button"
          class="list-group-item-action border-0 bg-transparent text-start w-100 p-3"
          @click="handleSelect(result)"
          data-testid="address-suggestion"
        >
          <span class="fw-medium">{{ result.label }}</span>
          <span v-if="result.postal" class="text-muted small ms-2"> S({{ result.postal }}) </span>
        </button>
      </li>
    </ul>

    <ul
      v-else-if="hasSearched && query.trim() !== ''"
      class="list-group position-absolute w-100 mt-1 shadow-sm"
      style="z-index: 1050"
    >
      <li class="list-group-item text-muted" data-testid="address-no-results">No results found.</li>
    </ul>
  </div>
</template>
