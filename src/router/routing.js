import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DetailView from '../views/DetailView.vue'
import LoginView from '../views/LoginView.vue'
import AdminEventsView from '../views/AdminEventsView.vue'
import { auth, getAccountByUid, isAdmin, isLoggedIn } from '../firebase.js'

/** Accesso alle rotte `/admin/*`: login + ruolo admin. */
async function beforeEnterRequireAdmin(_to, _from, next) {
  await auth.authStateReady()
  if (!isLoggedIn()) {
    next({ name: 'login' })
    return
  }
  const uid = auth.currentUser?.uid
  const account = uid ? await getAccountByUid(uid) : null
  if (!isAdmin(account)) {
    next({ name: 'home' })
    return
  }
  next()
}

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
  {
    path: '/admin/events',
    name: 'adminEvents',
    component: AdminEventsView,
    beforeEnter: beforeEnterRequireAdmin,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
