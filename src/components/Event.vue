<script setup>
import { computed } from 'vue'
import QrCode from './QrCode2.vue/index.js'
import { absoluteUrl } from '../utils.js'

const props = defineProps({
  /** Oggetto evento con `id` documento Firestore, `title` o `name`, `description`, … */
  event: {
    type: Object,
    required: true,
  },
})

/** URL pubblico della pagina evento (stesso path usato negli admin QR). */
const pageUrl = computed(() => absoluteUrl(`/qrcodes/${props.event.id}`))

const displayTitle = computed(
  () => props.event.title ?? props.event.name ?? '—',
)

const displayDescription = computed(
  () => props.event.description ?? '—',
)
</script>

<template>
  <article class="w-full max-w-lg rounded-2xl bg-black/5 p-6">
    <div class="flex flex-col items-center gap-4">
      <div class="flex w-full flex-col gap-1 text-center">
        <h2 class="text-xl font-bold leading-snug">
          {{ displayTitle }}
        </h2>
        <p class="text-base leading-snug font-normal whitespace-pre-line">
          {{ displayDescription }}
        </p>
      </div>

      <QrCode :content="pageUrl" class="text-xs" />

    </div>
  </article>
</template>
