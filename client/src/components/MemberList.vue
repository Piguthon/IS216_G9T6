<!--
  FILE:     src/components/MemberList.vue
  OWNER:    P1 (team-written)
  PURPOSE:  Lists meetup members and whether each has set a start point
  PROPS:    members (Array), currentMemberId (String)
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
// TODO (P1)
</script>

<template>
  <div data-testid="member-list">
    <!-- TODO (P1): build this component -->
  </div>
</template>
