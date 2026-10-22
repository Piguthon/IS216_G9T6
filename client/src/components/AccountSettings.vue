<!-- OWNER: JX. Account forms use refs/computed, Axios PUT and props/emits. -->
<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { BASE_URL } from '../config'
import { useAuthStore } from '../stores/auth'

const props = defineProps({ user: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const auth = useAuthStore()
const router = useRouter()
const name = ref(props.user.name)
const nameMessage = ref('')
const nameError = ref(false)
const savingName = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmation = ref('')
const showPasswords = ref(false)
const changingPassword = ref(false)
const passwordMessage = ref('')
const passwordChanged = ref(false)
const settingsExpanded = ref(false)
const showPasswordConfirm = ref(false)

function confirmPasswordChange() {
  if (!changingPassword.value && canChangePassword.value) showPasswordConfirm.value = true
}
const rules = computed(() => [
  { label: 'At least 8 characters', met: newPassword.value.length >= 8 },
  { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword.value) },
  { label: 'One lowercase letter', met: /[a-z]/.test(newPassword.value) },
  { label: 'One digit', met: /[0-9]/.test(newPassword.value) },
  { label: 'One symbol', met: /[^A-Za-z0-9\s]/.test(newPassword.value) },
])
const canChangePassword = computed(() => currentPassword.value && rules.value.every(rule => rule.met) &&
  newPassword.value === confirmation.value && newPassword.value !== currentPassword.value)

function errorText(error) {
  if (error.response && error.response.status === 401) {
    auth.clearSession()
    router.push('/login')
  }
  if (error.response && error.response.data && error.response.data.error) return error.response.data.error
  return 'Unable to save changes. Please try again.'
}

async function saveName() {
  if (savingName.value || !name.value.trim()) return
  savingName.value = true
  nameMessage.value = ''
  try {
    const response = await axios.put(`${BASE_URL}/users/me`, { name: name.value.trim() }, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    emit('updated', response.data.user)
    nameError.value = false
    nameMessage.value = 'Name updated.'
  } catch (error) {
    nameError.value = true
    nameMessage.value = errorText(error)
  } finally {
    savingName.value = false
  }
}

async function savePassword() {
  if (changingPassword.value || !canChangePassword.value || !showPasswordConfirm.value) return
  showPasswordConfirm.value = false
  changingPassword.value = true
  passwordMessage.value = ''
  try {
    await axios.put(`${BASE_URL}/users/me/password`, {
      currentPassword: currentPassword.value, newPassword: newPassword.value,
    }, { headers: { Authorization: `Bearer ${auth.token}` } })
    auth.clearSession()
    passwordChanged.value = true
    router.push('/login')
  } catch (error) {
    passwordMessage.value = errorText(error)
  } finally {
    currentPassword.value = ''
    newPassword.value = ''
    confirmation.value = ''
    showPasswords.value = false
    changingPassword.value = false
  }
}
</script>

<template>
  <div class="card shadow-sm border-0 mt-4">
    <div class="card-body p-4">
      <h2 class="h5 mb-0">
        <button type="button" class="btn btn-outline-primary w-100 d-flex justify-content-between align-items-center"
          :aria-expanded="settingsExpanded" aria-controls="account-settings-content"
          :disabled="savingName || changingPassword" @click="settingsExpanded = !settingsExpanded">
          Account settings
          <span aria-hidden="true">{{ settingsExpanded ? '−' : '+' }}</span>
        </button>
      </h2>
      <div id="account-settings-content" v-show="settingsExpanded" class="mt-3">
      <div v-if="passwordChanged" class="alert alert-success" role="status">
        Password changed. You have been signed out.
        <RouterLink to="/login">Log in with your new password</RouterLink>.
      </div>
      <template v-else>
        <form class="mb-4" @submit.prevent="saveName">
          <label for="profile-name" class="form-label">Profile name</label>
          <input id="profile-name" v-model.trim="name" class="form-control mb-2" maxlength="100" required :disabled="savingName" />
          <p v-if="nameMessage" class="alert small" :class="nameError ? 'alert-danger' : 'alert-success'" :role="nameError ? 'alert' : 'status'">{{ nameMessage }}</p>
          <button class="btn btn-outline-primary" :disabled="savingName || !name">{{ savingName ? 'Saving...' : 'Save name' }}</button>
        </form>
        <h3 class="h6">Change password</h3>
        <form @submit.prevent="confirmPasswordChange">
          <fieldset :disabled="changingPassword || showPasswordConfirm">
            <label for="current-password" class="form-label">Current password</label>
            <input id="current-password" v-model="currentPassword" :type="showPasswords ? 'text' : 'password'"
              autocomplete="current-password" class="form-control mb-3" required />
            <label for="new-password" class="form-label">New password</label>
            <input id="new-password" v-model="newPassword" :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password" class="form-control" required minlength="8" aria-describedby="change-password-rules" />
            <ul id="change-password-rules" class="small list-unstyled mt-2">
              <li v-for="rule in rules" :key="rule.label" :class="rule.met ? 'text-success' : 'text-muted'">
                {{ rule.met ? '✓' : '○' }} {{ rule.label }}
              </li>
            </ul>
            <label for="confirm-new-password" class="form-label">Confirm new password</label>
            <input id="confirm-new-password" v-model="confirmation" :type="showPasswords ? 'text' : 'password'"
              autocomplete="new-password" class="form-control mb-2" required />
            <p v-if="confirmation" class="small" :class="confirmation === newPassword ? 'text-success' : 'text-danger'" role="status">
              {{ confirmation === newPassword ? 'Passwords match.' : 'Passwords do not match.' }}
            </p>
            <p v-if="newPassword && currentPassword === newPassword" class="small text-danger">Choose a different new password.</p>
            <div class="form-check mb-3">
              <input id="show-change-passwords" v-model="showPasswords" type="checkbox" class="form-check-input" />
              <label for="show-change-passwords" class="form-check-label">Show passwords</label>
            </div>
            <p v-if="passwordMessage" class="alert alert-danger" role="alert">{{ passwordMessage }}</p>
            <button class="btn btn-primary" :disabled="changingPassword || !canChangePassword">
              {{ changingPassword ? 'Updating...' : 'Change password' }}
            </button>
          </fieldset>
          <div v-if="showPasswordConfirm" class="alert alert-secondary mt-3 mb-0" role="alert">
            <h4 class="h6">Change password?</h4>
            <p>Changing your password signs you out. You will need to log in again with your new password.</p>
            <button type="button" class="btn btn-primary me-2" @click="savePassword">Confirm</button>
            <button type="button" class="btn btn-outline-secondary" @click="showPasswordConfirm = false">Cancel</button>
          </div>
        </form>
      </template>
      </div>
    </div>
  </div>
</template>
