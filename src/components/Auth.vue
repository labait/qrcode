<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, googleProvider, ensureUserAccount, getAccountByUid } from '../firebase.js'

import { useGlobal } from '../composables/global.js'
const global = useGlobal()

const user = ref(null)

let unsubscribeAuth = () => {}

onMounted(() => {
  global.loading ++
  unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (!u) {
      global.account = null
      return
    }
    try {
      await ensureUserAccount(u)
      global.account = await getAccountByUid(u.uid)
    } finally {
      global.loading --
    }
  })
})

onUnmounted(() => {
  unsubscribeAuth()
})

async function connectWithGoogle() {
  try {
    const { user: firebaseUser } = await signInWithPopup(auth, googleProvider)
    await ensureUserAccount(firebaseUser)
  } catch (err) {
    const code = err?.code
    if (code === 'auth/popup-closed-by-user') {
      console.info('[accounts] Google sign-in cancelled (popup closed)')
      return
    }
    console.error('[accounts] connectWithGoogle failed', {
      code,
      message: err?.message,
      err,
    })
  }
}

async function logout() {
  await firebaseSignOut(auth)
}
</script>

<template>
  <header
    class="w-full border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80"
  >
    <div class="mx-auto flex max-w-2xl items-center justify-end gap-3">
      <template v-if="!user">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          @click="connectWithGoogle"
        >
          Connect with Google
        </button>
      </template>
      <template v-else>
        <div class="flex items-center gap-3">
          <img
            v-if="user.photoURL"
            :src="user.photoURL"
            :alt="user.displayName || 'User'"
            class="h-9 w-9 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700"
            referrerpolicy="no-referrer"
            width="36"
            height="36"
          />
          <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {{ user.displayName || user.email || 'User' }}
          </span>
          <button
            type="button"
            class="text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </template>
    </div>
  </header>
</template>
