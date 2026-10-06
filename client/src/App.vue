<script setup>
import { RouterView } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'
</script>

<template>
  <AppNavbar />
  <main class="container py-4" data-testid="app-main">
    <RouterView />
  </main>
</template>
