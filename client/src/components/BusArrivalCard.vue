<!--
  FILE:     src/components/BusArrivalCard.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Live waiting times for the buses in the user's route, at the stops they board at
  PROPS:    buses (Array of { stopCode, stopName, serviceNo })
  EMITS:    none
  TALKS TO: GET /api/bus-arrival/:stopCode
  DATA:     Bus { stopCode, services: [ { serviceNo, nextArrivals: [ ISO time strings ] } ] }
            arrival times are ISO strings with +08:00
  REVISE:   Wk 5 onMounted + Axios GET, computed
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { BASE_URL } from '../config'
const props = defineProps({
  buses: {
    type: Array,
    required: true,
  },
})

const arrivalsByStop = ref({}) // stopCode → services from the API
const message = ref('')
const isLoading = ref(false)

async function loadArrivals() {
  if (isLoading.value) return

  message.value = ''
  isLoading.value = true

  try {
    const stopCodes = [...new Set(props.buses.map((bus) => bus.stopCode))]
    const responses = await Promise.all(
      stopCodes.map((stopCode) => axios.get(`${BASE_URL}/bus-arrival/${stopCode}`)),
    )
    const loaded = {}
    stopCodes.forEach((stopCode, index) => {
      loaded[stopCode] = responses[index].data.services
    })
    arrivalsByStop.value = loaded
  } catch (error) {
    arrivalsByStop.value = {}
    if (error.response && error.response.data && error.response.data.error) {
      message.value = error.response.data.error
    } else {
      message.value = 'Unable to load bus arrivals.'
    }
  } finally {
    isLoading.value = false
  }
}

// Each bus in the route, with its next arrivals. Other buses at the stop are left out.
const rows = computed(() =>
  props.buses.map((bus) => {
    const services = arrivalsByStop.value[bus.stopCode] || []
    const service = services.find(
      (item) => item.serviceNo.toLowerCase() === bus.serviceNo.toLowerCase(),
    )
    return { ...bus, nextArrivals: service ? service.nextArrivals : [] }
  }),
)

function minutesUntil(arrivalTime) {
  const difference = new Date(arrivalTime).getTime() - Date.now()
  const minutes = Math.ceil(difference / 60000)

  return minutes <= 0 ? 'Arriving' : `${minutes} min`
}

onMounted(loadArrivals)
</script>

<template>
  <section class="card app-card" data-testid="bus-arrival-card">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
        <h2 class="h5 app-heading mb-0">Your buses</h2>

        <button
          type="button"
          class="app-btn btn-sign-outline app-btn-sm"
          :disabled="isLoading"
          @click="loadArrivals"
        >
          {{ isLoading ? 'Loading…' : 'Refresh' }}
        </button>
      </div>

      <p v-if="isLoading" role="status">Loading bus arrivals…</p>
      <p v-else-if="message" class="alert alert-danger" role="alert">
        {{ message }}
      </p>

      <div v-else class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Bus stop</th>
              <th scope="col">Bus</th>
              <th scope="col">Waiting time</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="`${row.stopCode}-${row.serviceNo}`"
              data-testid="bus-arrival-row"
            >
              <td>{{ row.stopName }} ({{ row.stopCode }})</td>
              <td class="fw-bold">{{ row.serviceNo }}</td>
              <td>
                <div class="d-flex flex-wrap gap-2">
                  <span
                    v-for="(arrival, index) in row.nextArrivals"
                    :key="index"
                    class="badge rounded-pill text-uppercase text-bg-light"
                  >
                    {{ minutesUntil(arrival) }}
                  </span>
                  <span v-if="row.nextArrivals.length === 0" class="text-muted small">
                    No upcoming arrivals
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
