<!--
  FILE:     src/views/MeetupLobbyView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  Meetup home: details, share code, member list; each member sets their start point
  ROUTE:    /meetup/:code
  TALKS TO: GET /api/meetups/:code, PUT /api/meetups/:code/members/:memberId
            uses AddressSearch, MemberList
  DATA:     Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
            sends { start: { label, postal, lat, lng } }
  REVISE:   Wk 4 route params · Wk 5 onMounted + Axios GET/PUT · Wk 6 props, emits, localStorage
  DONE WHEN:
    - [ ] details + code shown
    - [ ] members with start status
    - [ ] "you" can set or change your start
    - [ ] button to results once at least 2 members have a start
    - [ ] responsive
    - [ ] testids
-->
<script setup>
// STEPS (script: TODO 1-5 · template: TODO 6-11)
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Imports: ref, computed, onMounted, axios, BASE_URL, useRoute.
//         Example: route params in Week 4/wk4_example/src/components/Example10.vue

// TODO 2: Read the meetup code from the route params. Add refs for the meetup (null),
//         "is loading" (true) and an error message.

// TODO 3: async function loadMeetup(): GET ${BASE_URL}/meetups/<code> in try/catch.
//         Show "No meetup with code ..." on a 404 and a generic message otherwise.
//         Always finish loading.
//         Example: fetchStudents in Week 6/Code_Along/client/src/App.vue

// TODO 4: In onMounted: call loadMeetup() and read "my" member id from localStorage
//         (fairspot-member-<code>) into a ref.

// TODO 5: A computed that says whether "I" am a member of this meetup.
</script>

<template>
  <section data-testid="meetup-lobby-page">
    <h1 class="h3">Meetup Lobby</h1>

    <!-- TODO 6: Loading state (Bootstrap spinner), then the error alert, then the content. -->

    <!-- TODO 7: Details card ("card app-card"): occasion, date, time, host.
                 Share box: the code in app-code. -->

    <!-- TODO 8: Members list with v-for + :key on member _id, marking "(you)".
                 Start inline; switch to the MemberList component later. -->

    <!-- TODO 9: If I'm not a member, show a "Join this meetup" link to /join. -->

    <!-- TODO 10 (later): Set my start point with AddressSearch + PUT, and a
                 "See fair meeting points" button once at least 2 members have a start. -->

    <!-- TODO 11: testids: lobby-loading, lobby-error, lobby-occasion, lobby-host, lobby-code,
                 lobby-member (on each member item), lobby-join-link -->
  </section>
</template>
