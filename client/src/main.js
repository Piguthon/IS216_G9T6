// Libraries used (all free / open source):
//   Vue 3 (https://vuejs.org, MIT)
//   Vue Router (https://router.vuejs.org, MIT)
//   Pinia (https://pinia.vuejs.org, MIT)
//   Bootstrap 5 (https://getbootstrap.com, MIT)

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
