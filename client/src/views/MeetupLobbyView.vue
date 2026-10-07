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
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useRoute } from 'vue-router';
import { BASE_URL } from '../config';
// TODO 2: Read the meetup code from the route params. Add refs for the meetup (null),
//         "is loading" (true) and an error message.
const route = useRoute();
const code = route.params.code;

const meetup = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');
const myMemberId = ref(null);

// TODO 3: async function loadMeetup(): GET ${BASE_URL}/meetups/<code> in try/catch.
//         Show "No meetup with code ..." on a 404 and a generic message otherwise.
//         Always finish loading.
//         Example: fetchStudents in Week 6/Code_Along/client/src/App.vue
async function loadMeetup() {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const response = await axios.get(`${BASE_URL}/meetups/${code}`);
    meetup.value = response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      errorMessage.value = `No meetup with code ${code} was found.`;
    } else {
      errorMessage.value = 'Failed to load meetup details. Please try again.';
    }
  }
  
  isLoading.value = false;
};

// TODO 4: In onMounted: call loadMeetup() and read "my" member id from localStorage
//         (fairspot-member-<code>) into a ref.
onMounted(() => {
  myMemberId.value = localStorage.getItem(`fairspot-member-${code}`);
  loadMeetup();
});
// TODO 5: A computed that says whether "I" am a member of this meetup.
const isMember = computed(() => {
  if (!meetup.value || !meetup.value.members || !myMemberId.value) {
    return false;
  }
  
  let found = false;
  for (let i = 0; i < meetup.value.members.length; i++) {
    if (meetup.value.members[i]._id === myMemberId.value) {
      found = true;
      break;
    }
  }
  return found;
});
</script>

<template>
  <section data-testid="meetup-lobby-page">
    <h1 class="h3">Meetup Lobby</h1>

    <!-- TODO 6: Loading state (Bootstrap spinner), then the error alert, then the content. -->
    <div v-if="isLoading" class="text-center my-5" data-testid="lobby-loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading..</span>
      </div>
    </div>
    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="lobby-error">
      {{ errorMessage }}
    </div>
    <!-- TODO 7: Details card ("card app-card"): occasion, date, time, host.
                 Share box: the code in app-code. -->
    <div v-else-if="meetup">
      <!-- TODO 7: Details card -->
      <div class="card app-card mb-4">
        <div class="card-body">
          <h2 class="h5 text-primary mb-3" data-testid="lobby-occasion">{{ meetup.occasion }}</h2>
          <p class="mb-1"><strong>Date:</strong> {{ meetup.date }}</p>
          <p class="mb-1"><strong>Time:</strong> {{ meetup.time }}</p>
          <p class="mb-4" data-testid="lobby-host"><strong>Host:</strong> {{ meetup.hostName }}</p>

          <div class="p-3 bg-light rounded text-center border">
            <p class="text-muted mb-2 mb-0">Share this code with your group</p>
            <div class="app-code mt-2" data-testid="lobby-code">
              {{ meetup.code }}
            </div>
          </div>
        </div>
      </div>
    <!-- TODO 8: Members list with v-for + :key on member _id, marking "(you)".
                 Start inline; switch to the MemberList component later. -->
      <div class="card app-card mb-4">
        <div class="card-body">
          <h3 class="h5 mb-3">Members</h3>
          <ul class="list-group list-group-flush">
            <li 
              v-for="member in meetup.members" 
              :key="member._id" 
              class="list-group-item d-flex justify-content-between align-items-center px-0"
              data-testid="lobby-member"
            >
              <div>
                <span class="fw-medium">{{ member.name }}</span>
                <span v-if="member._id === myMemberId" class="text-muted ms-2 fst-italic">(you)</span>
              </div>
              <div>
                <span v-if="member.start" class="badge bg-success rounded-pill">Ready</span>
                <span v-else class="badge bg-secondary rounded-pill">Waiting</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    <!-- TODO 9: If I'm not a member, show a "Join this meetup" link to /join. -->
      <div v-if="!isMember" class="text-center mt-4">
        <router-link to="/join" class="btn btn-primary w-100" data-testid="lobby-join-link">
          Join this meetup
        </router-link>
      </div>
    </div>
    <!-- TODO 10 (later): Set my start point with AddressSearch + PUT, and a
                 "See fair meeting points" button once at least 2 members have a start. -->

    <!-- TODO 11: testids: lobby-loading, lobby-error, lobby-occasion, lobby-host, lobby-code,
                 lobby-member (on each member item), lobby-join-link -->
  </section>
</template>
