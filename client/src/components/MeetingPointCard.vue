<!--
  FILE:     src/components/MeetingPointCard.vue
  OWNER:    JS (team-written)
  PURPOSE:  One ranked meeting point (MRT station or bus interchange) with every member's
            public-transport time to it, so the group can see how fair it is
  PROPS:    point (Ranking item from GET /api/ranking/:code), rank, selected,
            confirmed (the host chose this one), scaleMinutes (bar length of a full bar, so
            bars compare across cards)
  EMITS:    select (stationId)
-->
<script setup>
import { computed } from 'vue'

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

function barWidth(minutes) {
  const scale = Math.max(props.scaleMinutes, props.point.longestMinutes, 1)
  return `${(minutes / scale) * 100}%`
}
</script>

<template>
  <button
    type="button"
    class="list-group-item list-group-item-action text-start p-3 point"
    :class="{ 'point-selected': selected }"
    :aria-pressed="selected"
    @click="emit('select', props.point.stationId)"
    data-testid="meeting-point-card"
  >
    <!-- Top row: rank, name and type, longest trip -->
    <span class="d-flex align-items-start gap-3">
      <span class="h1 app-heading mb-0 point-rank" aria-hidden="true">{{ rank }}</span>
      <span class="d-block flex-grow-1">
        <span class="h4 app-heading d-block mb-1">
          <span class="visually-hidden">Rank {{ rank }}: </span>{{ point.name }}
        </span>
        <span class="small point-muted">
          {{ typeLabel }}
          <span v-if="confirmed" class="badge rounded-pill text-uppercase point-confirmed ms-1"
            >Confirmed</span
          >
        </span>
      </span>
      <span class="d-block text-end">
        <span class="h3 app-heading d-block mb-0">{{ point.longestMinutes }}</span>
        <span class="d-block small point-muted">min longest</span>
      </span>
    </span>

    <!-- One row per member: name, bar, minutes. The longest trip has the darker bar. -->
    <span class="d-block mt-3">
      <span
        v-for="t in sortedTimes"
        :key="t.memberId"
        class="row g-2 align-items-center small"
        data-testid="meeting-point-time"
      >
        <span class="col-4 text-truncate">{{ t.name }}</span>
        <span class="col d-block">
          <span class="progress point-track d-flex" aria-hidden="true">
            <span
              class="progress-bar d-block"
              :class="t.minutes === point.longestMinutes ? 'point-bar-longest' : 'point-bar'"
              :style="{ width: barWidth(t.minutes) }"
            ></span>
          </span>
        </span>
        <span class="col-3 text-end fw-bold">{{ t.minutes }} min</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
/* Card text is black (Bootstrap's clickable list items are grey) */
.point {
  color: #000000;
}

/* Selected card: black background, white text */
.point-selected {
  background-color: #000000;
  color: #ffffff;
}

/* Normal card: teal rank and bars, the longest trip in black */
.point-rank {
  color: #0f766e;
}

.point-muted {
  color: #6c757d;
}

.point-track {
  height: 8px;
}

.point-bar {
  background-color: #0f766e;
}

.point-bar-longest {
  background-color: #000000;
}

.point-confirmed {
  background-color: #0f766e;
}

/* Selected card (black background): brighter colours so they stay visible */
.point-selected .point-rank {
  color: #2dd4bf;
}

.point-selected .point-muted {
  color: #c9cbc8;
}

.point-selected .point-track {
  background-color: #3a3a3a;
}

.point-selected .point-bar {
  background-color: #2dd4bf;
}

.point-selected .point-bar-longest {
  background-color: #ffffff;
}

.point-selected .point-confirmed {
  background-color: #2dd4bf;
  color: #000000;
}
</style>
