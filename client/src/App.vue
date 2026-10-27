<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'
</script>

<template>
  <!-- Full-height column, so the footer stays at the bottom on short pages -->
  <div class="d-flex flex-column min-vh-100">
    <AppNavbar />
    <main class="container py-5 flex-grow-1" data-testid="app-main">
      <RouterView />
    </main>
    <!-- Footer: same colours as the navbar (black background, light text) -->
    <footer class="bg-black py-4 small" data-bs-theme="dark">
      <div class="container d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="app-logo">FairSpot</span>
        <span class="text-body-secondary">
          Fair meeting points across Singapore's MRT network. IS216 G9T6.
        </span>
      </div>
    </footer>
  </div>
</template>
