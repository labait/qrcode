<script setup>
import { provide } from 'vue'
import { createGlobalState, globalInjectionKey } from './composables/global.js'

import Auth from './components/Auth.vue'
import Loading from './components/Loading.vue'

const global = createGlobalState()
provide(globalInjectionKey, global)
</script>

<template>
  <Loading v-if="global.loading > 0" />
  <div class="min-h-screen flex flex-col">
    <Auth />
    <main
      class="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center px-4 py-4"
    >
      <router-view />
    </main>
  </div>
</template>
