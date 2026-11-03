<!--
  FILE:     src/components/MeetingPointCard.vue
  OWNER:    JS (team-written)
  PURPOSE:  One ranked meeting point (MRT station or bus interchange) with every member's
            trip time to it by their own travel mode, so the group can see how fair it is
  PROPS:    point (Ranking item from GET /api/ranking/:code), rank, selected,
            confirmed (the host chose this one), scaleMinutes (bar length of a full bar, so
            bars compare across cards)
  EMITS:    select (stationId)
-->
<script setup>
import { computed } from 'vue'
import { tripTone } from '../utils/trip-tone'

const props = defineProps({
  point: { type: Object, required: true },
  rank: { type: Number, required: true },
  selected: { type: Boolean, default: false },
  confirmed: { type: Boolean, default: false },
  scaleMinutes: { type: Number, default: 0 },
})
const emit = defineEmits(['select'])

const typeLabel = computed(() =>
  props.point.type === 'interchange' ? 'Bus interchange' : 'MRT station',
)

// Slowest trip first, so the number that decides the rank sits at the top
const sortedTimes = computed(() => [...props.point.times].sort((a, b) => b.minutes - a.minutes))

const shortestMinutes = computed(() => Math.min(...props.point.times.map((t) => t.minutes)))

function barWidth(minutes) {
  const scale = Math.max(props.scaleMinutes, props.point.longestMinutes, 1)
  return `${(minutes / scale) * 100}%`
}
</script>

<template>
  <!-- An LED board: only the selected card opens up to show everyone's trip -->
  <button
    type="button"
    class="app-ticket point w-100 text-start"
    :class="{ 'point-selected': selected }"
    :aria-pressed="selected"
    @click="emit('select', props.point.stationId)"
    data-testid="meeting-point-card"
  >
    <!-- Top row: rank, name and type, longest trip -->
    <span class="d-flex align-items-center gap-3">
      <span class="point-number app-doto" aria-hidden="true">{{ rank }}</span>
      <span class="d-block flex-grow-1">
        <span class="point-name d-block">
          <span class="visually-hidden">Rank {{ rank }}: </span>{{ point.name }}
        </span>
        <span class="small">
          {{ typeLabel }}
          <span v-if="confirmed" class="badge rounded-pill text-uppercase text-bg-light ms-1"
            >Confirmed</span
          >
        </span>
      </span>
      <span class="d-block text-end">
        <span class="point-number app-doto d-block">{{ point.longestMinutes }}</span>
        <span class="d-block small">min longest</span>
      </span>
    </span>
    <!-- One row per member: white name and travel mode pill with the minutes, then a coloured bar -->
    <span v-if="selected" class="trips point-trips mt-3 pt-3">
      <span
        v-for="t in sortedTimes"
        :key="t.memberId"
        class="trip"
        :class="tripTone(t.minutes, point.longestMinutes, shortestMinutes)"
        data-testid="meeting-point-time"
      >
        <!-- A long name is cut short with "…" so the pill always stays on the same line -->
        <span class="trip-who d-flex align-items-center gap-2"
          ><strong class="text-truncate">{{ t.name }}</strong
          ><span
            v-if="t.travelMode === 'car'"
            class="mode-pill badge rounded-pill text-uppercase bg-secondary flex-shrink-0"
            data-testid="meeting-point-car"
            >car</span
          ><span
            v-else
            class="mode-pill badge rounded-pill text-uppercase bg-secondary flex-shrink-0"
            data-testid="meeting-point-transit"
            >public transport</span
          ></span
        >
        <span class="trip-track" aria-hidden="true">
          <span class="trip-fill d-block" :style="{ width: barWidth(t.minutes) }"></span>
        </span>
        <span class="trip-mins">{{ t.minutes }}<small>min</small></span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.point {
  cursor: pointer;
}

.point:focus-visible {
  outline: 3px solid #1d4f91;
  outline-offset: 2px;
}

/* The selected board gets a yellow edge */
.point-selected {
  border-color: #f2c230;
}

.point-number {
  font-size: 32px;
  line-height: 1;
}

.point-name {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.15;
}

.point-trips {
  gap: 8px;
  border-top: 2px dashed #3a3d41;
}

/* Two lines per member, so the pill fits beside the name even on phones:
   name and pill on the left, minutes on the right, then the bar across the full width */
.point-trips .trip {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'who mins'
    'track track';
  gap: 6px 10px;
}

.point-trips .trip-who {
  grid-area: who;
}

.point-trips .trip-track {
  grid-area: track;
}

.point-trips .trip-who strong {
  font-size: 14px;
  font-weight: 600;
}

/* Travel mode pill: the same size as the lobby's member list (Bootstrap's badge is 12px) */
.point-trips .trip-who .mode-pill {
  display: inline-block;
  font-size: 12px;
  opacity: 1;
}

.point-trips .trip-mins {
  grid-area: mins;
  font-size: 21px;
}
</style>
