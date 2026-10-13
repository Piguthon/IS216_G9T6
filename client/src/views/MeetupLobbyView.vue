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
import { useRoute,useRouter } from 'vue-router';
import { BASE_URL } from '../config';

import AddressSearch from '../components/AddressSearch.vue';
import MemberList from '../components/MemberList.vue';
import EditMeetupForm from '../components/EditMeetupForm.vue';
// TODO 2: Read the meetup code from the route params. Add refs for the meetup (null),
//         "is loading" (true) and an error message.
const route = useRoute();
const router = useRouter();
const code = route.params.code;

const meetup = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');
const myMemberId = ref(null);

const isEditing = ref(false);
const showDeleteConfirm = ref(false);

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

// Assuming the first member in the array is the creator/host
const hostId = computed(() => meetup.value?.members?.[0]?._id);
const isHost = computed(() => isMember.value && myMemberId.value === hostId.value);

const canSeeResults = computed(() => {
  if (!meetup.value || !meetup.value.members) return false;
  const readyCount = meetup.value.members.filter(m => m.start !== null).length;
  return readyCount >= 2;
});
//Set start point
async function handleSetStart(startPoint) {
  try {
    await axios.put(`${BASE_URL}/meetups/${code}/members/${myMemberId.value}`, { start: startPoint });
    await loadMeetup();
  } catch (err) {
    errorMessage.value = 'Failed to set start point.';
  }
}
//Host tools (edit)
async function handleEdit(details) {
  try {
    await axios.put(`${BASE_URL}/meetups/${code}`, {
      memberId: myMemberId.value,
      occasion: details.occasion,
      date: details.date,
      time: details.time
    });
    isEditing.value = false;
    await loadMeetup();
  } catch (err) {
    errorMessage.value = 'Failed to update meetup.';
  }
}

//Host tools (Delete)
async function handleDelete() {
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}`, {
      data: { memberId: myMemberId.value }
    });
    localStorage.removeItem(`fairspot-member-${code}`);
    router.push('/');
  } catch (err) {
    errorMessage.value = 'Failed to delete meetup.';
  }
}

//Leave (non-hosts)
async function handleLeave() {
  try {
    await axios.delete(`${BASE_URL}/meetups/${code}/members/${myMemberId.value}`);
    localStorage.removeItem(`fairspot-member-${code}`);
    router.push('/');
  } catch (err) {
    errorMessage.value = 'Failed to leave meetup.';
  }
}
</script>

<template>
  <section data-testid="meetup-lobby-page">
    <h1 class="h3 mb-4">Meetup Lobby</h1>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center my-5" data-testid="lobby-loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading..</span>
      </div>
    </div>
    
    <!-- Error alert -->
    <div v-else-if="errorMessage" class="alert alert-danger" data-testid="lobby-error">
      {{ errorMessage }}
    </div>
    
    <!-- Meetup Content -->
    <div v-else-if="meetup">
      <div class="row">
        <!-- Left Column: Details & Tools -->
        <div class="col-lg-6 mb-4">
          <!-- Details card -->
          <div class="card app-card mb-4">
            <div class="card-body">
              <div v-if="isEditing">
                <EditMeetupForm 
                  :meetup="meetup" 
                  @save="handleEdit" 
                  @cancel="isEditing = false"
                />
              </div>
              <div v-else>
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
          </div>

          <!-- Set my start point -->
          <div v-if="isMember" class="card app-card mb-4" data-testid="lobby-set-start">
            <div class="card-body">
              <h3 class="h5 mb-3">Set Your Start Point</h3>
              <AddressSearch @select="handleSetStart" />
            </div>
          </div>
        </div>

        <!-- Right Column: Members & Actions -->
        <div class="col-lg-6">
          <!-- MemberList Component replacing inline code -->
          <div class="card app-card mb-4">
            <div class="card-body">
              <h3 class="h5 mb-3">Members</h3>
              <MemberList 
                :members="meetup.members"
                :currentMemberId="myMemberId"
                :hostId="hostId"
              />
            </div>
          </div>

          <!-- "See fair meeting points" link -->
          <div v-if="canSeeResults" class="mb-4">
            <router-link :to="`/meetup/${code}/results`" class="btn btn-success w-100 py-3 fw-bold" data-testid="lobby-results-link">
              See fair meeting points
            </router-link>
          </div>

          <!-- TODO 9: Join meetup link -->
          <div v-if="!isMember" class="text-center mt-4">
            <router-link to="/join" class="btn btn-primary w-100" data-testid="lobby-join-link">
              Join this meetup
            </router-link>
          </div>

          <!-- Host tools & Leave options -->
          <div v-if="isMember" class="card app-card border-danger mt-4">
            <div class="card-body">
              <h3 class="h6 text-danger mb-3">Actions</h3>
              
              <!-- Host Tools -->
              <div v-if="isHost" class="d-flex flex-column gap-2">
                <button v-if="!isEditing" @click="isEditing = true" class="btn btn-outline-primary" data-testid="lobby-edit">
                  Edit Meetup Details
                </button>
                
                <div v-if="showDeleteConfirm" class="alert alert-danger p-3 mb-0">
                  <p class="mb-2">Are you sure? This will delete the meetup for everyone.</p>
                  <div class="d-flex gap-2">
                    <button @click="handleDelete" class="btn btn-danger btn-sm" data-testid="lobby-delete-confirm">
                      Yes, Delete it
                    </button>
                    <button @click="showDeleteConfirm = false" class="btn btn-outline-secondary btn-sm">
                      Cancel
                    </button>
                  </div>
                </div>
                <button v-else @click="showDeleteConfirm = true" class="btn btn-outline-danger" data-testid="lobby-delete">
                  Delete Meetup
                </button>
              </div>

              <!-- Non-Host Leave -->
              <div v-else>
                <button @click="handleLeave" class="btn btn-outline-danger w-100" data-testid="lobby-leave">
                  Leave Meetup
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </section>
</template>
