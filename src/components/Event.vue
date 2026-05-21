<script setup>
import { computed, ref } from 'vue'
import { ShareIcon } from '@heroicons/vue/24/outline'
import QrCode from './QrCode.vue'
import { absoluteUrl } from '../utils.js'

const props = defineProps({
  /** Oggetto evento con `id` documento Firestore, `title` o `name`, `description`, … */
  event: {
    type: Object,
    required: true,
  },
})

const isSharingFeedback = ref(false)

/** URL pubblico della pagina evento (stesso path usato negli admin QR). */
const pageUrl = computed(() => absoluteUrl(`/qrcodes/${props.event.id}`))

const displayTitle = computed(
  () => props.event.title ?? props.event.name ?? '—',
)

const displayDescription = computed(
  () => props.event.description ?? '—',
)

async function handleShare() {
  try {
    // Prova a usare la Web Share API (disponibile su mobile e browser moderni)
    if (navigator.share) {
      await navigator.share({
        title: displayTitle.value,
        text: `Partecipa: ${displayTitle.value}`,
        url: pageUrl.value,
      })
    } else {
      // Fallback: copia negli appunti
      await navigator.clipboard.writeText(pageUrl.value)
      showShareFeedback()
    }
  } catch (error) {
    // Se l'utente cancella la condivisione o c'è un errore, non fare nulla
    if (error.name !== 'AbortError') {
      console.error('[Event] share error:', error)
    }
  }
}

function showShareFeedback() {
  isSharingFeedback.value = true
  setTimeout(() => {
    isSharingFeedback.value = false
  }, 2000)
}
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

      <button
        type="button"
        class="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        :class="{ 'opacity-75': isSharingFeedback }"
        @click="handleShare"
      >
        <ShareIcon class="h-5 w-5" />
        <span>{{ isSharingFeedback ? 'Copiato!' : 'Condividi indirizzo' }}</span>
      </button>
    </div>
  </article>
</template>
