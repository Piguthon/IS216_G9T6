<!-- OWNER: JX. Week 6 props/emits: show locations and request changes from the parent. -->
<script setup>
import { ref } from 'vue'
defineProps({ locations: { type: Array, required: true }, busy: Boolean })
const emit = defineEmits(['rename', 'delete'])
const editingId = ref('')
const nickname = ref('')
const deletingId = ref('')

function edit(location) {
  editingId.value = location._id
  nickname.value = location.label
  deletingId.value = ''
}
</script>

<template>
  <p v-if="locations.length === 0" class="text-muted py-3 mb-0">
    No saved locations yet. Add Home, School or Work to keep your usual starting points handy.
  </p>
  <ul v-else class="list-group list-group-flush">
    <li v-for="location in locations" :key="location._id" class="list-group-item px-0 py-3">
      <form v-if="editingId === location._id" @submit.prevent="emit('rename', location._id, nickname)">
        <label :for="`nickname-${location._id}`" class="form-label">Location nickname</label>
        <input :id="`nickname-${location._id}`" v-model.trim="nickname" class="form-control mb-2"
          maxlength="60" required :disabled="busy" />
        <button class="btn btn-primary btn-sm me-2" :disabled="busy || !nickname">Save nickname</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy"
          @click="editingId = ''">Done</button>
      </form>
      <div v-else class="d-flex flex-wrap justify-content-between gap-3">
        <div>
          <h3 class="h6 mb-1">{{ location.label }}</h3>
          <p class="text-muted small mb-0">{{ location.address }}</p>
          <p v-if="location.postal" class="text-muted small mb-0">Singapore {{ location.postal }}</p>
        </div>
        <div class="d-flex align-items-start gap-2">
          <button type="button" class="btn btn-outline-primary btn-sm" :disabled="busy"
            @click="edit(location)">Rename</button>
          <button type="button" class="btn btn-outline-danger btn-sm" :disabled="busy"
            @click="deletingId = location._id">Delete</button>
        </div>
      </div>
      <div v-if="deletingId === location._id" class="alert alert-warning mt-3 mb-0">
        <p class="mb-2">Delete {{ location.label }}?</p>
        <button type="button" class="btn btn-danger btn-sm me-2" :disabled="busy"
          @click="emit('delete', location._id)">Confirm delete</button>
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy"
          @click="deletingId = ''">Cancel</button>
      </div>
    </li>
  </ul>
</template>
