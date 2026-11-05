<!-- Forms to change the account's name and password. -->
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
const accountMessage = ref('')
const accountError = ref(false)
const savingName = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmation = ref('')
const showPasswords = ref(false)
const changingPassword = ref(false)
const passwordChanged = ref(false)
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
const canChangePassword = computed(
  () =>
    currentPassword.value &&
    rules.value.every((rule) => rule.met) &&
    newPassword.value === confirmation.value &&
    newPassword.value !== currentPassword.value,
)

function errorText(error) {
  if (error.response && error.response.status === 401) {
    auth.clearSession()
    router.push('/login')
  }
  if (error.response && error.response.data && error.response.data.error)
    return error.response.data.error
  return 'Unable to save changes. Please try again.'
}

// Every update shows in one banner at the top of the card
function showMessage(text, isError) {
  accountMessage.value = text
  accountError.value = isError
}

async function saveName() {
  if (savingName.value || !name.value.trim()) return
  savingName.value = true
  accountMessage.value = ''
  try {
    const response = await axios.put(
      `${BASE_URL}/users/me`,
      { name: name.value.trim() },
      {
        headers: { Authorization: `Bearer ${auth.token}` },
      },
    )
    emit('updated', response.data.user)
    showMessage('Name updated.', false)
  } catch (error) {
    showMessage(errorText(error), true)
  } finally {
    savingName.value = false
  }
}

async function savePassword() {
  if (changingPassword.value || !canChangePassword.value || !showPasswordConfirm.value) return
  showPasswordConfirm.value = false
  changingPassword.value = true
  accountMessage.value = ''
  try {
    await axios.put(
      `${BASE_URL}/users/me/password`,
      {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
      { headers: { Authorization: `Bearer ${auth.token}` } },
    )
    auth.clearSession()
    passwordChanged.value = true
    router.push('/login')
  } catch (error) {
    showMessage(errorText(error), true)
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
  <div v-if="passwordChanged" class="alert alert-success mb-0" role="status">
    Password changed. You have been signed out.
    <RouterLink to="/login">Log in with your new password</RouterLink>.
  </div>
  <template v-else>
    <p
      v-if="accountMessage"
      :class="accountError ? 'alert alert-danger' : 'alert alert-success'"
      :role="accountError ? 'alert' : 'status'"
      data-testid="account-message"
    >
      {{ accountMessage }}
    </p>
    <div class="row g-4">
      <div class="col-md-5">
        <form @submit.prevent="saveName">
          <h3 class="h5 app-heading mb-3">Your name</h3>
          <label for="profile-name" class="form-label fw-bold">Profile name</label>
          <input
            id="profile-name"
            v-model.trim="name"
            class="form-control app-input mb-2"
            maxlength="100"
            required
            :disabled="savingName"
          />
          <button class="app-btn btn-sign-outline" :disabled="savingName || !name">
            {{ savingName ? 'Saving...' : 'Save name' }}
          </button>
        </form>
        <slot></slot>
      </div>
      <div class="col-md-7">
        <form @submit.prevent="confirmPasswordChange">
          <h3 class="h5 app-heading mb-3">Change password</h3>
          <fieldset :disabled="changingPassword || showPasswordConfirm">
            <label for="current-password" class="form-label fw-bold">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              :type="showPasswords ? 'text' : 'password'"
              autocomplete="current-password"
              class="form-control app-input mb-3"
              required
            />
            <div class="row g-3">
              <div class="col-12">
                <label for="new-password" class="form-label fw-bold">New password</label>
                <input
                  id="new-password"
                  v-model="newPassword"
                  :type="showPasswords ? 'text' : 'password'"
                  autocomplete="new-password"
                  class="form-control app-input"
                  required
                  minlength="8"
                  aria-describedby="change-password-rules"
                />
              </div>
              <div class="col-12">
                <label for="confirm-new-password" class="form-label fw-bold"
                  >Confirm new password</label
                >
                <input
                  id="confirm-new-password"
                  v-model="confirmation"
                  :type="showPasswords ? 'text' : 'password'"
                  autocomplete="new-password"
                  class="form-control app-input"
                  required
                />
              </div>
            </div>
            <ul
              id="change-password-rules"
              class="d-flex flex-wrap column-gap-3 small list-unstyled mt-2 mb-2"
            >
              <li
                v-for="rule in rules"
                :key="rule.label"
                :class="rule.met ? 'text-success' : 'text-muted'"
              >
                {{ rule.met ? '✓' : '○' }} {{ rule.label }}
              </li>
            </ul>
            <p
              v-if="confirmation"
              class="small mb-2"
              :class="confirmation === newPassword ? 'text-success' : 'text-danger'"
              role="status"
            >
              {{ confirmation === newPassword ? 'Passwords match.' : 'Passwords do not match.' }}
            </p>
            <p v-if="newPassword && currentPassword === newPassword" class="small text-danger mb-2">
              Choose a different new password.
            </p>
            <div class="form-check mb-3">
              <input
                id="show-change-passwords"
                v-model="showPasswords"
                type="checkbox"
                class="form-check-input app-check"
              />
              <label for="show-change-passwords" class="form-check-label">Show passwords</label>
            </div>
            <button class="app-btn btn-sign" :disabled="changingPassword || !canChangePassword">
              {{ changingPassword ? 'Updating...' : 'Change password' }}
            </button>
          </fieldset>
          <div v-if="showPasswordConfirm" class="alert alert-secondary mt-3 mb-0" role="alert">
            <h4 class="h6 app-heading">Change password?</h4>
            <p>
              Changing your password signs you out. You will need to log in again with your new
              password.
            </p>
            <button type="button" class="app-btn btn-sign me-2" @click="savePassword">
              Confirm
            </button>
            <button type="button" class="app-btn btn-quiet" @click="showPasswordConfirm = false">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </template>
</template>
