<!--
  FILE:     src/components/LiveEtaList.vue
  OWNER:    S (team-written)
  PURPOSE:  Everyone's live trip time to the meeting point, soonest first (live map page)
  PROPS:    people (Array of { memberId, name, travelMode, etaMinutes, arriveAt, updatedAt,
                               isStale })
            myMemberId (String): marks your own row
            now (Number, milliseconds): keeps "updated 20s ago" current
  EMITS:    none
  DATA:     etaMinutes is null when OneMap found no route; arriveAt is "HH:MM"
  REVISE:   Wk 5 computed · Wk 6 props
  DONE WHEN:
    - [ ] rows sorted by trip time, people without a route last
    - [ ] your own row says "You"
    - [ ] a phone that stopped updating shows "last seen …" in grey
    - [ ] readable at 320px wide
-->
<script setup>
import { computed } from 'vue'
import { formatTime } from '../utils/meetup-date'
import { timeAgo, byTripTime } from '../utils/live-time'
import { tripTone } from '../utils/trip-tone'

// STEPS

// TODO 1: Declare the props from the header.
const props = defineProps({
  people: { type: Array, required: true },
  myMemberId: { type: String, default: '' },
  now: { type: Number, required: true },
})

// TODO 2: The longest and shortest known trip, for the traffic-light colours and bar widths
//         (the same board as the summary page).
const knownMinutes = computed(() =>
  props.people.filter((person) => person.etaMinutes !== null).map((person) => person.etaMinutes),
)
const longest = computed(() => Math.max(...knownMinutes.value))
const shortest = computed(() => Math.min(...knownMinutes.value))

// TODO 3: rows: a sorted copy of people (byTripTime from utils/live-time.js), each with isMe and
//         its colour. Tip: [...props.people] copies the array, so sort() doesn't change the prop.
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
/* A very long name wraps instead of running into the bar */
.trip-who strong {
  overflow-wrap: anywhere;
}

/* main.css makes every span in .trip-who a full-width block; this one is a small label */
.trip-who .badge {
  display: inline-block;
}

/* A phone that stopped updating: dimmed, so nobody trusts an old position */
.is-stale {
  opacity: 0.55;
}

.is-stale .trip-fill {
  background-color: #6c757d;
}
</style>
