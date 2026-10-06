<!--
  FILE:     src/views/CreateMeetupView.vue
  OWNER:    reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:  Host creates a meetup and gets a shareable code
  ROUTE:    /create
  TALKS TO: POST /api/meetups
  DATA:     sends { hostName, occasion, date, time } → receives Meetup
            Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                     members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  REVISE:   Wk 4 v-model, useRouter().push · Wk 5 Axios POST, async/await, try/catch, v-model modifiers
  DONE WHEN:
    - [ ] required fields validated with a message
    - [ ] success shows the code and a "Go to meetup" button to /meetup/:code
    - [ ] error message on failure
    - [ ] responsive
    - [ ] testids on inputs, buttons, result
-->
<script setup>
// STEPS (script: TODO 1-4 · template: TODO 5-9)
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Imports: ref from vue, axios, BASE_URL from ../config.js, useRouter.
//         Example: Week 6/Code_Along/client/src/App.vue (TODOs 1-2)

// TODO 2: Refs for the four inputs (host name, occasion, date, time), an error message,
//         the created meetup (starts null), and an "is saving" flag.

// TODO 3: async function createMeetup()
//           - show a message if a required field is empty
//           - otherwise axios.post to ${BASE_URL}/meetups with the four fields, inside try/catch
//           - on success, keep response.data and remember the host's member _id in
//             localStorage under the key fairspot-member-<code>
//           - on failure, show the server's error message if there is one, otherwise a
//             friendly generic one
//         Examples: Week 6/Code_Along/client/src/App.vue (addStudent);
//                   localStorage in Week 6/wk6_example/src/views/Example7View.vue

// TODO 4: function goToMeetup() uses the router to open /meetup/<code>.
//         Example: Week 4/wk4_example/src/components/Example11.vue
</script>

<template>
  <section data-testid="create-meetup-page">
    <h1 class="h3">Create Meetup</h1>

    <!-- TODO 5: Page header (app-page-header) and a form inside "card app-card", with Bootstrap
                 form controls bound with v-model:
                   - .trim on the text inputs
                   - type="date" and type="time" for date and time
                   - submit with @submit.prevent
                   - button disabled while saving -->

    <!-- TODO 6: Error alert (alert alert-danger) shown only when there is a message. -->

    <!-- TODO 7: Success panel shown once the meetup exists: the code in app-code, a short
                 "share this code" line, and a "Go to meetup" button. -->

    <!-- TODO 8: Use these testids:
                 create-host-name, create-occasion, create-date, create-time, create-submit,
                 create-error, create-result, create-code, create-go-to-meetup -->

    <!-- TODO 9: Check it at 375px and XL in DevTools. -->
  </section>
</template>
