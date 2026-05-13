<script setup>
import { provide } from 'vue'
import { createGlobalState, globalInjectionKey } from './composables/global.js'

import Auth from './components/Auth.vue'

import Test from './components/Test.vue'
import Loading from './components/Loading.vue'
import ItemsList from './components/ItemsList.vue'

const global = createGlobalState()
provide(globalInjectionKey, global)
</script>

<template>
  <Loading v-if="global.loading > 0" />
  <div class="min-h-screen flex flex-col">
    <Auth />
    <main
      class="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-4"
    >
      <h1 class="mb-4 text-2xl font-bold mb-4">Hello World</h1>
      <ItemsList class="mb-4"/>
      <Test />
    </main>
  </div>
</template>
