<script setup>
import { getAccessProviders } from '../accessProviders.js'
import ConnectGoogle from '../components/ConnectGoogle.vue'
import ConnectMicrosoft from '../components/ConnectMicrosoft.vue'

const access = getAccessProviders()
</script>

<template>
  <div class="mx-auto flex w-full max-w-sm flex-col items-stretch gap-6 px-4 py-8 text-center">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold">
        Accedi
      </h1>
      <p class="text-base opacity-90">
        Utilizza il tuo account per accedere.
      </p>
    </header>

    <div class="flex w-full flex-col gap-3">
      <ConnectGoogle v-if="access.google" />
      <ConnectMicrosoft v-if="access.microsoft" />
    </div>
  </div>
</template>
