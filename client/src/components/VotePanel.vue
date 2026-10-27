<!--
  FILE:     src/components/VotePanel.vue
  OWNER:    JS (team-written)
  PURPOSE:  One round of group voting (meeting point or venue): every option's vote count,
            my vote, and the host's confirm button. The parent loads the shared tallies from
            /api/votes/:code (polling) and sends the votes, so everyone sees the same counts.
  PROPS:    title, options [ { optionId, name, count, ... } ], myVote (optionId or null),
            voterCount (members who can vote), canVote, isHost, final (confirmed option or null),
            busy, emptyText (shown when there is nothing to vote on yet)
  EMITS:    vote (option), confirm (option), reopen ()
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  options: { type: Array, required: true },
  myVote: { type: String, default: null },
  voterCount: { type: Number, default: 0 },
  canVote: { type: Boolean, default: true },
  isHost: { type: Boolean, default: false },
  final: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Nothing to vote on yet.' },
})
const emit = defineEmits(['vote', 'confirm', 'reopen'])

const votesCast = computed(() => props.options.reduce((sum, option) => sum + option.count, 0))
const topCount = computed(() => Math.max(0, ...props.options.map((option) => option.count)))

function share(option) {
  const total = Math.max(props.voterCount, votesCast.value, 1)
  return `${(option.count / total) * 100}%`
}
</script>

<template>
  <div class="card app-card" data-testid="vote-panel">
    <div class="card-body p-4">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
        <h2 class="h4 app-heading mb-0">{{ title }}</h2>
        <span
          v-if="!final && voterCount"
          class="small text-muted text-nowrap"
          data-testid="vote-progress"
        >
          {{ votesCast }} of {{ voterCount }} voted
        </span>
      </div>

      <!-- Confirmed: show the choice instead of the ballot -->
      <div v-if="final" class="app-ticket text-start" data-testid="vote-final">
        <p class="small app-on-dark-muted mb-1">Confirmed by the host</p>
        <p class="h2 app-heading app-text-bright mb-0">{{ final.name }}</p>
        <button
          v-if="isHost"
          type="button"
          class="app-btn btn-quiet app-btn-sm mt-3"
          :disabled="busy"
          @click="emit('reopen')"
          data-testid="vote-reopen"
        >
          Change choice
        </button>
      </div>

      <template v-else>
        <p v-if="options.length === 0" class="app-empty py-3 mb-0" data-testid="vote-empty">
          {{ emptyText }}
        </p>
        <ul v-else class="list-group mb-3">
          <li
            v-for="option in options"
            :key="option.optionId"
            class="list-group-item"
            :class="{ 'vote-mine': myVote === option.optionId }"
            data-testid="vote-option"
          >
            <div class="d-flex justify-content-between align-items-center gap-2">
              <span class="fw-bold">
                {{ option.name }}
                <span
                  v-if="option.count > 0 && option.count === topCount"
                  class="badge rounded-pill text-uppercase text-bg-teal ms-1"
                  >Leading</span
                >
              </span>
              <span class="h5 app-heading mb-0 text-nowrap" data-testid="vote-count">
                {{ option.count }} {{ option.count === 1 ? 'vote' : 'votes' }}
              </span>
            </div>
            <div class="progress vote-track my-2" aria-hidden="true">
              <div class="progress-bar bg-teal" :style="{ width: share(option) }"></div>
            </div>
            <div v-if="canVote || isHost" class="d-flex flex-wrap gap-2">
              <button
                v-if="canVote"
                type="button"
                class="app-btn app-btn-sm"
                :class="myVote === option.optionId ? 'btn-teal' : 'btn-teal-outline'"
                :aria-pressed="myVote === option.optionId"
                :disabled="busy"
                @click="emit('vote', option)"
                data-testid="vote-button"
              >
                {{ myVote === option.optionId ? 'Your vote' : 'Vote' }}
              </button>
              <button
                v-if="isHost"
                type="button"
                class="app-btn btn-quiet app-btn-sm"
                :disabled="busy"
                @click="emit('confirm', option)"
                data-testid="vote-confirm"
              >
                Confirm as final
              </button>
            </div>
          </li>
        </ul>
        <p v-if="options.length > 0 && !isHost" class="small text-muted mb-0">
          The host confirms the final choice. Counts update every few seconds.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Thin vote bar */
.vote-track {
  height: 6px;
}

/* The option I voted for: pale teal */
.vote-mine {
  background-color: #e6f4f2;
}
</style>
