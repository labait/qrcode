<script setup>
import { computed } from 'vue'
import { useGlobal } from '../composables/global.js'

const global = useGlobal()

const message = computed(() => {
  const custom = String(global.loadingText ?? '').trim()
  return custom || 'Loading...'
})
</script>

<template>
  <div
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/20"
    role="status"
    aria-live="polite"
    :aria-label="message"
  >
    <div class="flex items-center rounded-lg bg-white/95 px-6 py-4 shadow-lg">
      <svg
        class="h-8 w-8 animate-spin text-current opacity-70"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span class="ml-3 opacity-80">{{ message }}</span>
    </div>
  </div>
</template>
