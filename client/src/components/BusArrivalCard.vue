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
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
const props = defineProps({
  stopCode: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
})

const services = ref([])
const message = ref('')
const isLoading = ref(false)

async function loadArrivals() {
  if (isLoading.value) return

  message.value = ''
  isLoading.value = true

  try {
    const response = await axios.get(`${BASE_URL}/bus-arrival/${props.stopCode}`)

    services.value = response.data.services
  } catch (error) {
    services.value = []
    message.value = error.response?.data?.error || 'Unable to load bus arrivals.'
  } finally {
    isLoading.value = false
  }
}

function minutesUntil(arrivalTime) {
  const difference = new Date(arrivalTime).getTime() - Date.now()
  const minutes = Math.ceil(difference / 60000)

  return minutes <= 0 ? 'Arriving' : `${minutes} min`
}

onMounted(loadArrivals)
</script>

<template>
  <section class="card" data-testid="bus-arrival-card">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
        <h2 class="h5 mb-0">
          {{ props.label || `Bus stop ${props.stopCode}` }}
        </h2>

        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          :disabled="isLoading"
          @click="loadArrivals"
        >
          {{ isLoading ? 'Loading…' : 'Refresh' }}
        </button>
      </div>

      <p v-if="isLoading" role="status">Loading bus arrivals…</p>
      <p v-else-if="message" class="text-danger" role="alert">
        {{ message }}
      </p>
      <p v-else-if="services.length === 0" class="text-muted">
        No bus services are available right now.
      </p>

      <ul v-else class="list-group list-group-flush">
        <li v-for="service in services" :key="service.serviceNo" class="list-group-item px-0">
          <div class="d-flex flex-wrap align-items-center gap-2">
            <strong class="me-2">Bus {{ service.serviceNo }}</strong>

            <span
              v-for="(arrival, index) in service.nextArrivals"
              :key="index"
              class="badge text-bg-light"
            >
              {{ minutesUntil(arrival) }}
            </span>

            <span v-if="service.nextArrivals.length === 0" class="text-muted small">
              No upcoming arrivals
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
