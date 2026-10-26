<!-- OWNER: JX. Week 6 props/emits: show locations and request changes from the parent. -->
<script setup>
import { ref } from 'vue'
import AddressSearch from './AddressSearch.vue'
defineProps({ locations: { type: Array, required: true }, busy: Boolean })
const emit = defineEmits(['rename', 'delete', 'default'])
const editingId = ref('')
const nickname = ref('')
const deletingId = ref('')
const replacementAddress = ref(null)

function edit(location) {
  editingId.value = location._id
  nickname.value = location.label
  deletingId.value = ''
  replacementAddress.value = null
}
</script>

<template>
  <p v-if="locations.length === 0" class="text-muted py-3 mb-0">
    No saved locations yet. Add Home, School or Work to keep your usual starting points handy.
  </p>
  <ul v-else class="list-group list-group-flush">
    <li v-for="location in locations" :key="location._id" class="list-group-item px-0 py-3">
      <form
        v-if="editingId === location._id"
        @submit.prevent="emit('rename', location._id, nickname, replacementAddress)"
        @keydown.enter.prevent
      >
        <label :for="`nickname-${location._id}`" class="form-label">Location name</label>
        <input
          :id="`nickname-${location._id}`"
          v-model.trim="nickname"
          class="form-control mb-2"
          maxlength="60"
          required
          :disabled="busy"
        />
        <p class="small text-muted">Current address: {{ location.address }}</p>
        <fieldset :disabled="busy">
          <AddressSearch
            :key="location._id"
            placeholder="Search for a replacement address (optional)"
            @select="replacementAddress = $event"
            @clear="replacementAddress = null"
          />
        </fieldset>
        <p v-if="replacementAddress" class="small text-success mt-2">
          New address: {{ replacementAddress.label }}
        </p>
        <div class="d-flex align-items-center gap-2 mt-2">
          <button class="btn btn-primary btn-sm" :disabled="busy || !nickname">Save changes</button>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :disabled="busy"
            @click="editingId = ''"
          >
            Cancel
          </button>
        </div>
      </form>
      <div v-else class="d-flex flex-wrap justify-content-between gap-3">
        <div>
          <h3 class="h6 mb-1">{{ location.label }}</h3>
          <span v-if="location.isDefault" class="badge text-bg-primary mb-1">Default</span>
          <p class="text-muted small mb-0">{{ location.address }}</p>
          <p v-if="location.postal" class="text-muted small mb-0">
            Singapore {{ location.postal }}
          </p>
        </div>
        <div class="d-flex align-items-start gap-2">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            :disabled="busy"
            @click="edit(location)"
          >
            Edit
          </button>
          <button
            v-if="!location.isDefault"
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :disabled="busy"
            @click="emit('default', location._id)"
          >
            Make default
          </button>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            :disabled="busy"
            @click="deletingId = location._id"
          >
            Delete
          </button>
        </div>
      </div>
      <div v-if="deletingId === location._id" class="alert alert-secondary mt-3 mb-0">
        <p class="mb-2">Delete {{ location.label }}?</p>
        <button
          type="button"
          class="btn btn-danger btn-sm me-2"
          :disabled="busy"
          @click="emit('delete', location._id)"
        >
          Confirm delete
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          :disabled="busy"
          @click="deletingId = ''"
        >
          Cancel
        </button>
      </div>
    </li>
  </ul>
</template>
