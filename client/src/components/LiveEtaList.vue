<!-- Everyone's live trip time to the meeting point, soonest first. -->
<script setup>
import { computed } from 'vue'
import { formatTime } from '../utils/meetup-date'
import { timeAgo, byTripTime } from '../utils/live-time'
import { tripTone } from '../utils/trip-tone'

const props = defineProps({
  people: { type: Array, required: true },
  myMemberId: { type: String, default: '' },
  now: { type: Number, required: true },
})

// The longest and shortest known trip, for the bar colours and widths
const knownMinutes = computed(() =>
  props.people.filter((person) => person.etaMinutes !== null).map((person) => person.etaMinutes),
)
const longest = computed(() => Math.max(...knownMinutes.value))
const shortest = computed(() => Math.min(...knownMinutes.value))

// People sorted by trip time, each with isMe and its colour
const rows = computed(() =>
  [...props.people].sort(byTripTime).map((person) => ({
    ...person,
    isMe: person.memberId === props.myMemberId,
    tone:
      person.etaMinutes === null || person.isStale
        ? ''
        : tripTone(person.etaMinutes, longest.value, shortest.value),
  })),
)
</script>

<template>
  <p v-if="rows.length === 0" class="small mb-0" data-testid="live-eta-empty">
    No one is sharing yet. Trip times appear here once people share.
  </p>
  <ul v-else class="trips" data-testid="live-eta-list">
    <li
      v-for="row in rows"
      :key="row.memberId"
      class="trip"
      :class="[row.tone, { 'is-stale': row.isStale }]"
      data-testid="live-eta-row"
    >
      <div class="trip-who">
        <strong
          >{{ row.name }}<span v-if="row.isMe" class="badge text-bg-light ms-1">You</span></strong
        >
        <span v-if="row.travelMode === 'car'" data-testid="live-eta-car">by car</span>
        <span v-if="row.etaMinutes !== null">arrives {{ formatTime(row.arriveAt) }}</span>
        <span v-else>No route found</span>
        <span>{{ row.isStale ? 'last seen' : 'updated' }} {{ timeAgo(row.updatedAt, now) }}</span>
      </div>
      <div class="trip-track" aria-hidden="true">
        <div
          v-if="row.etaMinutes !== null"
          class="trip-fill"
          :style="{ width: (row.etaMinutes / longest) * 100 + '%' }"
        ></div>
      </div>
      <span v-if="row.etaMinutes !== null" class="trip-mins"
        >{{ row.etaMinutes }}<small>min</small></span
      >
    </li>
  </ul>
</template>

<style scoped>
.trip-who strong {
  overflow-wrap: anywhere;
}

.trip-who .badge {
  display: inline-block;
}

.is-stale {
  opacity: 0.55;
}

.is-stale .trip-fill {
  background-color: #6c757d;
}
</style>
