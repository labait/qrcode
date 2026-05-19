<script setup>
import { computed } from 'vue'
import Qrcode from './qrcode.vue'
import { absoluteUrl } from '../utils.js'

const props = defineProps({
  /** Oggetto evento con `id` documento Firestore, `name`, `description`, … */
  event: {
    type: Object,
    required: true,
  },
})

/** URL pubblico della pagina evento (stesso path usato negli admin QR). */
const pageUrl = computed(() => absoluteUrl(`/qrcodes/${props.event.id}`))
</script>

<template>
  <article
    class="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
  >
    <div class="flex flex-col items-center gap-6">
      <Qrcode :content="pageUrl" />

      <dl class="w-full space-y-3 text-base text-neutral-800 dark:text-neutral-200">
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            id
          </dt>
          <dd class="mt-0.5 font-mono text-sm break-all">
            {{ event.id }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            name
          </dt>
          <dd class="mt-0.5 leading-snug">
            {{ event.name ?? '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            description
          </dt>
          <dd class="mt-0.5 whitespace-pre-line leading-snug">
            {{ event.description ?? '—' }}
          </dd>
        </div>
      </dl>
    </div>
  </article>
</template>
