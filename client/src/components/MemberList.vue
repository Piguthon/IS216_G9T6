<!--
  FILE:     src/components/MemberList.vue
  OWNER:    P1 (team-written)
  PURPOSE:  Lists meetup members and whether each has set a start point
  PROPS:    members (Array), currentMemberId (String), hostId (String)
  EMITS:    none
  TALKS TO: none
  DATA:     Meetup members:
            Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  REVISE:   Wk 5 v-for + :key · Wk 6 props
  DONE WHEN:
    - [ ] each member shows name + start label or "waiting"
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
})
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
        </div>

        <!-- Start Label or Waiting Badge -->
        <div data-testid="member-start">
          <span v-if="member.start">
            {{ member.start.label }}
          </span>
          <span v-else class="badge bg-secondary"> waiting </span>
        </div>
      </li>
    </ul>
  </div>
</template>
