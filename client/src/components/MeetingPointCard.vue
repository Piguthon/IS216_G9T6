<!--
  PITCH PLACEHOLDER (demo/pitch branch only; never merge into integration or main). JS replaces this.
  One ranked meeting point. Props: point, rank, selected. Emits: select (stationId).
-->
<script setup>
const props = defineProps({
  point: { type: Object, required: true },
  rank: { type: Number, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])
</script>

<template>
  <button
    type="button"
    class="list-group-item list-group-item-action text-start"
    :class="{ active: selected }"
    @click="emit('select', props.point.stationId)"
    data-testid="meeting-point-card"
  >
    <div class="d-flex justify-content-between align-items-center gap-2">
      <span class="fw-semibold">{{ rank }}. {{ point.name }}</span>
      <span class="badge" :class="selected ? 'text-bg-light' : 'text-bg-primary'">
        longest {{ point.longestMinutes }} min
      </span>
    </div>
    <div class="small mt-1">
      <span
        v-for="t in point.times"
        :key="t.memberId"
        class="me-3 d-inline-block"
        :class="{ 'fw-bold': t.minutes === point.longestMinutes }"
      >
        {{ t.name }}: {{ t.minutes }} min
      </span>
    </div>
  </button>
</template>
