<!--
  FILE:     src/components/EditMeetupForm.vue
  OWNER:    I (team-written)
  PURPOSE:  The host's form for changing a meetup's occasion, date and time
  PROPS:    meetup (Object)
  EMITS:    save with { occasion, date, time } · cancel
  TALKS TO: none (the lobby makes the API call)
  REVISE:   Wk 4 v-model · Wk 6 props/emits
-->
<script setup>
import { ref } from 'vue'
import { todayInSingapore } from '../utils/meetup-date'

const props = defineProps({
  meetup: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['save', 'cancel'])

const occasion = ref(props.meetup.occasion)
const date = ref(props.meetup.date)
const time = ref(props.meetup.time)
const errorMessage = ref('')
const today = ref(todayInSingapore())

const handleSave = () => {
  if (!occasion.value || !date.value || !time.value) {
    errorMessage.value = 'Please fill in all fields.'
    return
  }

  today.value = todayInSingapore()
  if (date.value < today.value) {
    errorMessage.value = 'Choose today or a future date.'
    return
  }
  errorMessage.value = ''
  emit('save', {
    occasion: occasion.value,
    date: date.value,
    time: time.value,
  })
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <div data-testid="edit-meetup-form">
    <div v-if="errorMessage" class="alert alert-danger" role="alert">
      {{ errorMessage }}
    </div>

    <form @submit.prevent="handleSave">
      <div class="mb-3">
        <label for="occasion" class="form-label fw-bold">Occasion</label>
        <input
          type="text"
          id="occasion"
          class="form-control app-input"
          v-model="occasion"
          data-testid="edit-occasion"
          placeholder="e.g. Dinner, Study Session"
        />
      </div>

      <div class="row mb-4">
        <div class="col-md-6 mb-3 mb-md-0">
          <label for="date" class="form-label fw-bold">Date</label>
          <input
            type="date"
            id="date"
            class="form-control app-input"
            v-model="date"
            :min="today"
            data-testid="edit-date"
          />
        </div>

        <div class="col-md-6">
          <label for="time" class="form-label fw-bold">Time</label>
          <input
            type="time"
            id="time"
            class="form-control app-input"
            v-model="time"
            data-testid="edit-time"
          />
        </div>
      </div>

      <div class="d-flex gap-2">
        <button type="submit" class="app-btn btn-sign" data-testid="edit-save">Save</button>
        <button
          type="button"
          class="app-btn btn-quiet"
          @click="handleCancel"
          data-testid="edit-cancel"
        >
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>
