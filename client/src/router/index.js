// src/router/index.js
// Vue Router (https://router.vuejs.org, MIT): maps each URL to a view in src/views/.

import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CreateMeetupView from '../views/CreateMeetupView.vue'
import JoinMeetupView from '../views/JoinMeetupView.vue'
import MeetupLobbyView from '../views/MeetupLobbyView.vue'
import MeetupResultsView from '../views/MeetupResultsView.vue'
import SummaryView from '../views/SummaryView.vue'
import LoginView from '../views/LoginView.vue'
import SignupView from '../views/SignupView.vue'
import ProfileView from '../views/ProfileView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  linkActiveClass: 'active',
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/create',
      name: 'create-meetup',
      component: CreateMeetupView,
    },
    {
      path: '/join',
      name: 'join-meetup',
      component: JoinMeetupView,
    },
    {
      path: '/meetup/:code',
      name: 'meetup-lobby',
      component: MeetupLobbyView,
    },
    {
      path: '/meetup/:code/results',
      name: 'meetup-results',
      component: MeetupResultsView,
    },
    {
      path: '/meetup/:code/summary',
      name: 'meetup-summary',
      component: SummaryView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/signup',
      name: 'signup',
      component: SignupView,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true },
    },
    // Unknown URLs go home
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// Week 11 navigation guard: also runs when using the browser Back button.
router.beforeEach((to) => {
  if (!to.meta.requiresAuth) return true
  const auth = useAuthStore()
  if (auth.isLoggedIn) return true
  return { path: '/login' }
})

export default router
