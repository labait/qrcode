<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useGlobal } from '../composables/global.js'
import Event from '../components/Event.vue'

const global = useGlobal()

const events = ref([])

async function load() {
  global.loading++
  try {
    const snap = await getDocs(collection(db, 'events'))
    events.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } finally {
    global.loading--
  }
}

onMounted(load)
</script>

<template>
  <div class="flex w-full max-w-5xl flex-col gap-8 px-4 pb-36 pt-2">
    <header class="space-y-1 text-center">
      <h1 class="text-2xl font-semibold">
        Eventi
      </h1>
      <p class="text-base">
        QR codice e attributi pubblici della collezione
        <span class="font-mono">events</span>
      </p>
    </header>

    <div class="flex justify-center">
      <RouterLink
        :to="{ name: 'adminEventNew' }"
        class="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        <PlusIcon
          class="size-5 shrink-0"
          aria-hidden="true"
        />
        Add Event
      </RouterLink>
    </div>

    <p
      v-if="events.length === 0"
      class="text-center opacity-90"
    >
      Nessun evento in collezione.
    </p>

    <div
      v-else
      class="grid grid-cols-1 gap-8 lg:grid-cols-2"
    >
      <div
        v-for="ev in events"
        :key="ev.id"
        class="flex justify-center"
      >
        <Event :event="ev" />
      </div>
    </div>
  </div>
</template>
