<!--
  PITCH PLACEHOLDER (branch local/pitch-demo only; never committed). JS replaces this.
  Static voting UI: votes stay in this page only (no backend). One sample vote from
  "another member" is shown on the first option so the tallies aren't empty.
  Props: options (top ranked points), isHost (unused for the demo: everyone can confirm).
  Emits: confirm (stationId).
-->
<script setup>
import { ref } from 'vue'

defineProps({
  options: { type: Array, required: true },
  isHost: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm'])

const myVote = ref('')

function voteCount(option, index) {
  let count = index === 0 ? 1 : 0
  if (myVote.value === option.stationId) count++
  return count
}
</script>

<template>
  <div class="card app-card" data-testid="vote-panel">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h6 mb-0">Vote for a meeting point</h2>
        <span class="badge text-bg-warning">Sample data</span>
      </div>
      <ul class="list-group mb-3">
        <li
          v-for="(option, index) in options"
          :key="option.stationId"
          class="list-group-item d-flex justify-content-between align-items-center gap-2"
          data-testid="vote-option"
        >
          <span>{{ option.name }}</span>
          <span class="d-flex align-items-center gap-2">
            <span class="badge text-bg-secondary" data-testid="vote-count">
              {{ voteCount(option, index) }} vote(s)
            </span>
            <button
              type="button"
              class="btn btn-sm"
              :class="myVote === option.stationId ? 'btn-primary' : 'btn-outline-primary'"
              @click="myVote = option.stationId"
              data-testid="vote-button"
            >
              {{ myVote === option.stationId ? 'Voted' : 'Vote' }}
            </button>
          </span>
        </li>
      </ul>
      <button
        type="button"
        class="btn btn-success w-100"
        :disabled="!myVote"
        @click="emit('confirm', myVote)"
        data-testid="vote-confirm"
      >
        Confirm as the final choice
      </button>
    </div>
  </div>
</template>
