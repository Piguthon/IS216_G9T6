<!--
  FILE:     src/views/JoinMeetupView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  A friend joins with the meetup code and their name (no account needed)
  ROUTE:    /join
  TALKS TO: GET /api/meetups/:code, POST /api/meetups/:code/members
  DATA:     sends { name } → receives { _id, name, start: null }
            this member's _id is remembered in localStorage so the lobby knows who "you" are
  REVISE:   Wk 5 Axios GET/POST · Wk 6 localStorage
  DONE WHEN:
    - [ ] unknown-code message
    - [ ] successful join goes to /meetup/:code
    - [ ] responsive
    - [ ] testids
-->
<script setup>
// STEPS (script: TODO 1-3 · template: TODO 4-5)
// Build this view after Create + Lobby work.

// TODO 1: Same imports as Create (src/views/CreateMeetupView.vue, TODO 1).

// TODO 2: Refs for the code, name, error message and "is joining".

// TODO 3: async function joinMeetup()
//           - both fields required
//           - normalise the code (e.g. uppercase)
//           - axios.post to ${BASE_URL}/meetups/<code>/members with { name }, inside try/catch
//           - 404 → "No meetup with that code"
//           - on success, save the new member _id in localStorage (fairspot-member-<code>)
//             and open /meetup/<code>
</script>

<template>
  <section data-testid="join-meetup-page">
    <h1 class="h3">Join Meetup</h1>

    <!-- TODO 4: Header + form card + error alert, as in Create. -->

    <!-- TODO 5: testids: join-code, join-name, join-submit, join-error -->
  </section>
</template>
