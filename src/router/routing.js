import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DetailView from '../views/DetailView.vue'
import LoginView from '../views/LoginView.vue'
import { auth, isLoggedIn } from '../firebase.js'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    async beforeEnter(_to, _from, next) {
      await auth.authStateReady()
      if (!isLoggedIn()) {
        next({ name: 'login' })
      } else {
        next()
      }
    },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    async beforeEnter(_to, _from, next) {
      await auth.authStateReady()
      if (isLoggedIn()) next({ name: 'home' })
      else next()
    },
  },
  {
    path: '/items/:id',
    name: 'itemDetail',
    component: DetailView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
