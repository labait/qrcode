<script setup>
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider, ensureUserAccount } from '../firebase.js'

async function connectWithGoogle() {
  try {
    const { user } = await signInWithPopup(auth, googleProvider)
    await ensureUserAccount(user)
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
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-base font-medium text-white shadow-sm transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
    @click="connectWithGoogle"
  >
    Accedi con Google
  </button>
</template>
