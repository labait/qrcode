<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="flex w-full shrink-0 justify-center px-4 pt-5 pb-2">
    <div class="flex w-full max-w-5xl items-center justify-center">
      <RouterLink
        to="/"
        class="app-header-brand inline-flex items-center justify-center"
      >
        <img
          class="app-header-brand-logo h-10 w-auto sm:h-11"
          src="/themes/laba-logo.svg"
          alt="LABA"
          width="145"
          height="40"
          decoding="async"
        />
        <span class="app-header-brand-wordmark font-sans text-6xl font-bold lowercase tracking-tighter sm:text-6xl">
          floop
        </span>
      </RouterLink>
    </div>
  </header>
</template>
