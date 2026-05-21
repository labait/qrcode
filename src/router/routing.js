import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DetailView from '../views/DetailView.vue'
import LoginView from '../views/LoginView.vue'
import AdminEventsView from '../views/AdminEventsView.vue'
import AdminEventsForm from '../views/AdminEventsForm.vue'
import EventView from '../views/EventView.vue'
import ParticipationView from '../views/ParticipationView.vue'
import { auth, getAccountByUid, isAdmin, isLoggedIn } from '../firebase.js'

/** Solo utenti autenticati (es. join partecipazione). */
async function beforeEnterRequireAuth(_to, _from, next) {
  await auth.authStateReady()
  if (!isLoggedIn()) {
    next({ name: 'login' })
    return
  }
  next()
}

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
    path: '/qrcodes/:id',
    name: 'eventQrcode',
    component: EventView,
  },
  {
    path: '/events/:id',
    name: 'eventDetail',
    component: EventView,
  },
  {
    path: '/participations/:id',
    name: 'participationDetail',
    component: ParticipationView,
    beforeEnter: beforeEnterRequireAuth,
  },
  {
    path: '/admin/events',
    name: 'adminEvents',
    component: AdminEventsView,
    beforeEnter: beforeEnterRequireAdmin,
  },
  {
    path: '/admin/events/new',
    name: 'adminEventNew',
    component: AdminEventsForm,
    beforeEnter: beforeEnterRequireAdmin,
  },
  {
    path: '/admin/events/:id/edit',
    name: 'adminEventEdit',
    component: AdminEventsForm,
    beforeEnter: beforeEnterRequireAdmin,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
