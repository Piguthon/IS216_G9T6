<!--
  FILE:     src/components/MemberList.vue
  OWNER:    P1 (team-written)
  PURPOSE:  Lists meetup members, whether each has set a start point, and who's driving
  PROPS:    members (Array), currentMemberId (String), hostId (String),
            canRemove (Boolean): the viewer is the host, so show Remove on everyone else
  EMITS:    remove with the member
  TALKS TO: none
  DATA:     Meetup members:
            Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null,
                                  travelMode: 'transit' | 'car' } ] }
  REVISE:   Wk 5 v-for + :key · Wk 6 props/emits
  DONE WHEN:
    - [ ] each member shows name + start label or "waiting"
    - [ ] drivers show "car"
    - [ ] the host can remove anyone but themselves
    - [ ] "you" marked
    - [ ] Bootstrap list group
-->
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
      <!-- One item per member using v-for -->
      <li
        v-for="member in members"
        :key="member._id"
        class="list-group-item d-flex justify-content-between align-items-center"
        data-testid="member-item"
      >
        <!-- Member Name and Labels -->
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
        </div>

        <!-- Start Label or Waiting Badge, and the host's Remove button -->
        <div class="d-flex align-items-center gap-2 text-end">
          <div data-testid="member-start">
            <span v-if="member.start">
              {{ member.start.label }}
            </span>
            <span v-else class="badge rounded-pill text-uppercase bg-secondary"> waiting </span>
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
