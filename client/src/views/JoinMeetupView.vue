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
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { BASE_URL } from '../config';

const router = useRouter();
// TODO 2: Refs for the code, name, error message and "is joining".
const code = ref('');
const name = ref('');
const errorMessage = ref('');
const isJoining = ref(false);
// TODO 3: async function joinMeetup()
//           - both fields required
//           - normalise the code (e.g. uppercase)
//           - axios.post to ${BASE_URL}/meetups/<code>/members with { name }, inside try/catch
//           - 404 → "No meetup with that code"
//           - on success, save the new member _id in localStorage (fairspot-member-<code>)
//             and open /meetup/<code>
async function joinMeetup() {
  errorMessage.value = '';

  if (!code.value || !name.value) {
    errorMessage.value = 'Please fill out all fields to join the meetup.';
    return;
  }
  // Normalise the code to uppercase as standard
  const normalizedCode = code.value.toUpperCase();
  isJoining.value = true;

  try {
    const response = await axios.post(`${BASE_URL}/meetups/${normalizedCode}/members`, {
      name: name.value
    });

    // Save the new member _id in localStorage
    const newMemberId = response.data._id;
    localStorage.setItem(`fairspot-member-${normalizedCode}`, newMemberId);

    // Navigate directly to the lobby
    router.push(`/meetup/${normalizedCode}`);
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      errorMessage.value = 'No meetup with that code was found.';
    } else if (error.response && error.response.data && error.response.data.error) {
      errorMessage.value = error.response.data.error;
    } else {
      errorMessage.value = 'Failed to join meetup. Please try again.';
    }
    isJoining.value = false;
  }
};
</script>

<template>
  <section data-testid="join-meetup-page">
    <header class="app-page-header mb-3">
      <h1 class="h3">Join Meetup</h1>
    </header>

    <!-- TODO 4: Header + form card + error alert, as in Create. -->
    <div class="card app-card mb-4">
      <div class="card-body">
        <form @submit.prevent="joinMeetup">
          
          <div class="mb-3">
            <label for="code" class="form-label">Meetup Code</label>
            <input 
              type="text" 
              id="code" 
              class="form-control text-uppercase" 
              v-model.trim="code" 
              data-testid="join-code" 
              placeholder="e.g. ABCDEF"
            />
          </div>
          <div class="mb-3">
            <label for="name" class="form-label">Your Name</label>
            <input 
              type="text" 
              id="name" 
              class="form-control" 
              v-model.trim="name" 
              data-testid="join-name" 
              placeholder="What should we call you?"
            />
          </div>
          <div v-if="errorMessage" class="alert alert-danger" data-testid="join-error">
            {{ errorMessage }}
          </div>

          <button 
            type="submit" 
            class="btn btn-primary w-100 mt-2" 
            :disabled="isJoining" 
            data-testid="join-submit"
          >
            {{ isJoining ? 'Joining...' : 'Join Meetup' }}
          </button>
        </form>
    </div>
</div>
    <!-- TODO 5: testids: join-code, join-name, join-submit, join-error -->
  </section>
</template>
