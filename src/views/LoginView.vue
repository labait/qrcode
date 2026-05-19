<script setup>
import ConnectGoogle from '../components/ConnectGoogle.vue'
import ConnectMicrosoft from '../components/ConnectMicrosoft.vue'
</script>

<template>
  <div class="mx-auto flex w-full max-w-sm flex-col items-stretch gap-6 px-4 py-8 text-center">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        Accedi
      </h1>
      <p class="text-base text-neutral-600 dark:text-neutral-400">
        Utilizza un tuo account per accedere all'applicazione.
      </p>
    </header>

    <div class="flex w-full flex-col gap-3">
      <ConnectGoogle />
      <ConnectMicrosoft />
    </div>
  </div>
</template>
