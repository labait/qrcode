<script setup>
import { computed, provide } from 'vue'
import { createGlobalState, globalInjectionKey } from './composables/global.js'
import { isAdmin } from './firebase.js'

import AdminBar from './components/AdminBar.vue'
import AppHeader from './components/AppHeader.vue'
import Auth from './components/Auth.vue'
import Dialog from './components/Dialog.vue'
import Loading from './components/Loading.vue'

const global = createGlobalState()
provide(globalInjectionKey, global)

const padBottomForAdminBar = computed(() =>
  isAdmin(global.account) ? 'pb-36' : '',
)
</script>

<template>
  <Loading v-if="global.loading > 0" />
  <Dialog />
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main
      class="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center py-4 transition-[padding]"
      :class="padBottomForAdminBar"
    >
      <Auth />
      <router-view />
    </main>
    <AdminBar />
  </div>
</template>
