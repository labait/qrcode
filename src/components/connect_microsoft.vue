<script setup>
import { signInWithPopup } from 'firebase/auth'
import { auth, microsoftProvider } from '../firebase.js'

async function connectWithMicrosoft() {
  try {
    await signInWithPopup(auth, microsoftProvider)
  } catch (err) {
    const code = err?.code
    if (code === 'auth/popup-closed-by-user') {
      console.info('[accounts] Microsoft sign-in cancelled (popup closed)')
      return
    }
    console.error('[accounts] connectWithMicrosoft failed', {
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
    class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
    @click="connectWithMicrosoft"
  >
    Accedi con Microsoft
  </button>
</template>
