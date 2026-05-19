<script setup>
import { signInWithMicrosoftPreferred } from '../firebase.js'

async function connectWithMicrosoft() {
  try {
    await signInWithMicrosoftPreferred()
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
    class="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
    @click="connectWithMicrosoft"
  >
    <svg class="size-5 shrink-0" viewBox="0 0 21 21" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
    <span>Accedi con Microsoft</span>
  </button>
</template>
