<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useGlobal } from '../composables/global.js'
import { isAdmin } from '../firebase.js'

const global = useGlobal()
const visible = computed(() => isAdmin(global.account))
</script>

<template>
  <nav
    v-if="visible"
    class="pointer-events-auto fixed bottom-4 left-1/2 z-40 w-[min(calc(100vw-2rem),42rem)] -translate-x-1/2 px-4"
    aria-label="Barra amministratore"
  >
    <div
      class="flex items-center justify-center rounded-2xl border border-white/10 bg-neutral-900/70 px-4 py-3 shadow-lg backdrop-blur-md dark:bg-neutral-950/75"
    >
      <RouterLink
        to="/admin/events"
        class="rounded-md px-3  text-base  text-white/95 underline-offset-4 transition hover:text-white hover:underline"
      >
        Eventi QR
      </RouterLink>
    </div>
  </nav>
</template>
