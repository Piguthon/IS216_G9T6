// src/router/index.js
// Vue Router (https://router.vuejs.org, MIT): maps each URL to a view in src/views/.

import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CreateMeetupView from '../views/CreateMeetupView.vue'
import JoinMeetupView from '../views/JoinMeetupView.vue'
import MeetupLobbyView from '../views/MeetupLobbyView.vue'
import MeetupResultsView from '../views/MeetupResultsView.vue'
import SummaryView from '../views/SummaryView.vue'
import LiveMapView from '../views/LiveMapView.vue'
import LoginView from '../views/LoginView.vue'
import SignupView from '../views/SignupView.vue'
import LogoutView from '../views/LogoutView.vue'
import MeetupsView from '../views/MeetupsView.vue'
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
      meta: { requiresAuth: true },
    },
    {
      path: '/join',
      name: 'join-meetup',
      component: JoinMeetupView,
    },
    {
      path: '/meetups',
      name: 'meetups',
      component: MeetupsView,
      meta: { requiresAuth: true },
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
      path: '/meetup/:code/live',
      name: 'meetup-live',
      component: LiveMapView,
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
      path: '/logout',
      name: 'logout',
      component: LogoutView,
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
