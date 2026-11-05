<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'

const route = useRoute()
// The home page draws its own full-width scene. Every other page sits in the tiled working space.
const isInnerPage = computed(() => route.name && route.name !== 'home')
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <AppNavbar />
    <main
      class="flex-grow-1"
      :class="{ 'page-body d-flex flex-column': isInnerPage }"
      data-testid="app-main"
    >
      <div :class="{ 'container flex-grow-1 d-flex flex-column': isInnerPage }">
        <RouterView />
      </div>
    </main>
    <footer class="app-bar py-4 small" data-bs-theme="dark">
      <div class="container d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="app-logo">FairSpot</span>
        <span class="text-body-secondary">Copyright © 2026 Fairspot.</span>
      </div>
    </footer>
  </div>
</template>
