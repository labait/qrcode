<script setup>
import { useGlobal } from '../composables/global.js'

const global = useGlobal()
</script>

<template>
  <div class="w-full max-w-lg space-y-2 text-left text-base">
    <h2 class="text-lg font-semibold">Test component</h2>
    <pre>
      {{ global }}
    </pre>
  </div>
</template>