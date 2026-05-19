<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { useGlobal } from '../composables/global.js'
import { isAdmin } from '../firebase.js'

const global = useGlobal()
const visible = computed(() => isAdmin(global.account))
</script>

<template>
  <nav
    v-if="visible"
    class="pointer-events-auto fixed bottom-4 left-4 z-40"
    aria-label="Barra amministratore"
  >
    <div
      class="flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg bg-black/80"
    >
      <Cog6ToothIcon
        class="size-5 shrink-0 text-neutral-950 dark:text-white"
        aria-hidden="true"
      />
      <RouterLink
        to="/admin/events"
        class="rounded-md px-1 text-base font-medium text-neutral-950 underline-offset-4 transition hover:underline dark:text-white"
      >
        Events
      </RouterLink>
    </div>
  </nav>
</template>
