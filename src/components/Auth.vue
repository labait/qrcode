<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, ensureUserAccount, getAccountByUid } from '../firebase.js'

import { useGlobal } from '../composables/global.js'

const global = useGlobal()
const route = useRoute()

const user = ref(null)

const showAccediLink = computed(
  () => !user.value && route.path !== '/login',
)

/** Microsoft spesso non popola `photoURL`; si provano anche i provider allegati. */
const avatarUrl = computed(() => {
  const u = user.value
  if (!u) return ''
  if (u.photoURL) return u.photoURL
  const fromProvider = u.providerData?.find((p) => p?.photoURL)?.photoURL
  return fromProvider ?? ''
})

const initials = computed(() => {
  const u = user.value
  if (!u) return ''
  const name = u.displayName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const email = u.email ?? ''
  if (email.length >= 2) return email.slice(0, 2).toUpperCase()
  return '?'
})

let unsubscribeAuth = () => {}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
    global.loading++
    user.value = u
    if (!u) {
      global.account = null
      global.loading--
      return
    }
    try {
      await ensureUserAccount(u)
      global.account = await getAccountByUid(u.uid)
    } finally {
      global.loading--
    }
  })
})

onUnmounted(() => {
  unsubscribeAuth()
})

async function logout() {
  await firebaseSignOut(auth)
}
</script>

<template>
  <header class="w-full min-h-[10rem]">
    <div class="mx-auto flex w-full justify-center gap-3">
      <template v-if="!user">
        <RouterLink
          v-if="showAccediLink"
          to="/login"
          class="text-base font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Accedi con
        </RouterLink>
      </template>
      <template v-else>
        <div
          class="flex flex-col items-center gap-3 text-center"
          role="group"
          aria-label="Profilo utente"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="user.displayName || user.email || 'Utente'"
            class="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700"
            referrerpolicy="no-referrer"
            width="56"
            height="56"
            loading="lazy"
          />
          <div
            v-else
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-neutral-600 to-neutral-800 text-lg font-semibold text-white ring-2 ring-neutral-300 dark:from-neutral-500 dark:to-neutral-700 dark:ring-neutral-600"
            aria-hidden="true"
          >
            {{ initials }}
          </div>
          <span class="max-w-[16rem] text-base font-medium leading-snug text-neutral-900 dark:text-neutral-100">
            {{ user.displayName || user.email || 'Utente' }}
          </span>
          <button
            type="button"
            class="inline-flex text-base font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </template>
    </div>
  </header>
</template>
