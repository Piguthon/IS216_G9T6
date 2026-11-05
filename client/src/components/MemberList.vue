<!-- Lists meetup members, their start point, travel mode and whether they have confirmed. -->
<script setup>
defineProps({
  members: {
    type: Array,
    required: true,
  },
  currentMemberId: {
    type: String,
    required: false,
    default: null,
  },
  hostId: {
    type: String,
    required: true,
  },
  canRemove: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['remove'])
</script>

<template>
  <div data-testid="member-list">
    <ul class="list-group">
      <li
        v-for="member in members"
        :key="member._id"
        class="list-group-item d-flex justify-content-between align-items-center"
        data-testid="member-item"
      >
        <div>
          <span class="fw-bold">{{ member.name }}</span>
          <span v-if="member._id === currentMemberId" class="text-muted ms-2 fst-italic">
            (you)
          </span>
          <span v-if="member._id === hostId" class="text-muted ms-1 fst-italic"> (host) </span>
          <span
            v-if="member.travelMode === 'car'"
            class="badge rounded-pill text-uppercase bg-secondary ms-2"
            data-testid="member-car"
          >
            car
          </span>
          <span
            v-else
            class="badge rounded-pill text-uppercase bg-secondary ms-2"
            data-testid="member-transit"
          >
            public transport
          </span>
        </div>

        <div class="d-flex align-items-center gap-2 text-end">
          <div data-testid="member-start">
            <span v-if="member.start">
              {{ member.start.label }}
            </span>
            <span
              v-if="!member.ready"
              class="badge rounded-pill text-uppercase bg-secondary ms-1"
              data-testid="member-waiting"
            >
              waiting
            </span>
          </div>
          <button
            v-if="canRemove && member._id !== hostId"
            type="button"
            class="btn btn-outline-danger btn-sm"
            :aria-label="`Remove ${member.name}`"
            data-testid="member-remove"
            @click="emit('remove', member)"
          >
            Remove
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
