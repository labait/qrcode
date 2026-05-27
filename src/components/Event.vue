<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { LinkIcon, ChartBarSquareIcon, PencilSquareIcon, ShareIcon } from '@heroicons/vue/24/outline'
import QrCode from './QrCode.vue'
import { useGlobal } from '../composables/global.js'
import { isAdmin } from '../firebase.js'
import { absoluteUrl, formatTimestampFriendly } from '../utils.js'

const props = defineProps({
  /** Oggetto evento con `id` documento Firestore, `title` o `name`, `description`, … */
  event: {
    type: Object,
    required: true,
  },
})

const global = useGlobal()
const route = useRoute()
const isSharingFeedback = ref(false)

const isAdminUser = computed(() => isAdmin(global.account))
const showEventLink = computed(() => {
  const eventId = String(props.event.id ?? '').trim()
  if (!eventId) return true

  if (route.name === 'eventDetail' && String(route.params.id ?? '').trim() === eventId) {
    return false
  }

  if (route.name === 'participationDetail') {
    const participationEventId = String(
      global.participation?.event_id ?? global.event?.id ?? '',
    ).trim()
    if (participationEventId === eventId) return false
  }

  return true
})

/** URL pubblico della pagina evento (stesso path usato negli admin QR). */
const pageUrl = computed(() => absoluteUrl(`/qrcodes/${props.event.id}`))

const displayTitle = computed(
  () => props.event.title ?? props.event.name ?? '—',
)

const displayDescription = computed(
  () => props.event.description ?? '—',
)

const formattedValidFrom = computed(() =>
  formatTimestampFriendly(props.event.valid_from),
)

const formattedValidTo = computed(() =>
  formatTimestampFriendly(props.event.valid_to),
)

const showValidity = computed(
  () => props.event.valid_from != null || props.event.valid_to != null,
)

async function handleShare() {
  try {
    if (navigator.share) {
      await navigator.share({
        title: displayTitle.value,
        text: `Partecipa: ${displayTitle.value}`,
        url: pageUrl.value,
      })
    } else {
      await navigator.clipboard.writeText(pageUrl.value)
      showShareFeedback()
    }
  } catch (error) {
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
        <p class="text-base font-normal leading-snug whitespace-pre-line">
          {{ displayDescription }}
        </p>
      </div>

      <div
        v-if="showValidity"
        class="w-full space-y-1 text-center text-base"
      >
        <p class="text-sm font-semibold uppercase tracking-wide opacity-75">
          Valid from/to
        </p>
        <p>{{ formattedValidFrom }}</p>
        <p>{{ formattedValidTo }}</p>
      </div>

      <QrCode :content="pageUrl" class="text-xs" />

      <div class="mt-2 flex flex-wrap items-center justify-center gap-2">
        <RouterLink
          v-if="isAdminUser"
          :to="{ name: 'eventFeedbacks', params: { id: event.id } }"
          class="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Feedbacks evento"
        >
          <ChartBarSquareIcon class="h-5 w-5" aria-hidden="true" />
        </RouterLink>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          :class="{ 'opacity-75': isSharingFeedback }"
          @click="handleShare"
        >
          <ShareIcon class="h-5 w-5" />
          <span>{{ isSharingFeedback ? 'Copiato!' : 'Condividi indirizzo' }}</span>
        </button>
        <RouterLink
          v-if="isAdminUser"
          :to="{ name: 'adminEventEdit', params: { id: event.id } }"
          class="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Edit event"
        >
          <PencilSquareIcon class="h-5 w-5" aria-hidden="true" />
        </RouterLink>
        <RouterLink
          v-if="showEventLink"
          :to="{ name: 'eventDetail', params: { id: event.id } }"
          class="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white p-2 text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Apri pagina evento"
        >
          <LinkIcon class="h-5 w-5" aria-hidden="true" />
        </RouterLink>
      </div>
    </div>
  </article>
</template>
