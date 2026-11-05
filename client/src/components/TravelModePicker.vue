<!-- Lets a member choose how they're getting to the meetup; public transport by default. -->
<script setup>
defineProps({ currentMode: { type: String, default: 'transit' } })
const emit = defineEmits(['select'])

const modes = [
  { id: 'transit', label: 'Public transport' },
  { id: 'car', label: 'Car' },
]
</script>

<template>
  <div class="d-flex flex-wrap gap-2" role="group" aria-label="How you're getting there">
    <button
      v-for="mode in modes"
      :key="mode.id"
      type="button"
      class="app-btn"
      :class="mode.id === currentMode ? 'btn-sign' : 'btn-sign-outline'"
      :aria-pressed="mode.id === currentMode"
      :data-testid="`travel-mode-${mode.id}`"
      @click="emit('select', mode.id)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
