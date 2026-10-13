<!--
  FILE:     src/components/AppNavbar.vue
  OWNER:    P4 (team-written)
  PURPOSE:  Responsive top navigation
  PROPS:    none
  EMITS:    none
  TALKS TO: RouterLinks
  DATA:     none
  REVISE:   Wk 3 navbar, collapse · Wk 4 RouterLink
  DONE WHEN:
    - [ ] links: Home, Create Meetup, Join Meetup, Log in
    - [ ] collapses on phones
-->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoggedIn = ref(false)

// Re-evaluates whether the user is logged in
const checkAuth = () => {
  isLoggedIn.value = !!localStorage.getItem('fairspot-token')
}

onMounted(() => {
  // Check the initial state when the app loads
  checkAuth()
  // Listen for the custom event fired by LoginView.vue
  window.addEventListener('auth-change', checkAuth)
})

onUnmounted(() => {
  window.removeEventListener('auth-change', checkAuth)
})

const handleLogout = async () => {
  localStorage.removeItem('fairspot-token')
  checkAuth() // Instantly updates the navbar UI
  
  try {
    await router.push('/login')
  } catch (err) {
    console.error("Routing error on logout:", err)
  }
}
</script>

<!-- Responsive Bootstrap 5 navbar (https://getbootstrap.com/docs/5.3/components/navbar/) -->
<template>
  <nav class="navbar navbar-expand-md navbar-dark bg-primary" data-testid="app-navbar">
    <div class="container">
      <RouterLink class="navbar-brand" :to="{ name: 'home' }" data-testid="nav-brand">
        FairSpot
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#mainNavbar"
        aria-controls="mainNavbar"
        aria-expanded="false"
        aria-label="Toggle navigation"
        data-testid="nav-toggler"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="mainNavbar" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'home' }" data-testid="nav-home">
              Home
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'create-meetup' }" data-testid="nav-create">
              Create Meetup
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" :to="{ name: 'join-meetup' }" data-testid="nav-join">
              Join Meetup
            </RouterLink>
          </li>
          <template v-if="!isLoggedIn">
            <li class="nav-item">
              <RouterLink class="nav-link" to="/login" data-testid="nav-login">
                Log in
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/signup" data-testid="nav-signup">
                Sign up
              </RouterLink>
            </li>
          </template>
          
          <template v-else>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/profile" data-testid="nav-profile">
                Profile
              </RouterLink>
            </li>
            <li class="nav-item">
              <a href="#" class="nav-link" @click.prevent="handleLogout" data-testid="nav-logout">
                Log out
              </a>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>
