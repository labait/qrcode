<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { startEventFeedback, subscribeEvent } from '../firebase.js'
import { getEvent } from '../utils.js'
import { useGlobal } from '../composables/global.js'
import ParticipationsFeedback from '../components/ParticipationsFeedback.vue'

const route = useRoute()
const global = useGlobal()

const event = ref(null)
const ready = ref(false)
const starting = ref(false)
let unsubscribeEvent = () => {}

const eventId = computed(() => String(route.params.id ?? '').trim())

const displayTitle = computed(() => event.value?.title ?? event.value?.name ?? '—')
const displayDescription = computed(() => event.value?.description ?? '—')

async function resolveEventId() {
  const lookup = eventId.value
  if (!lookup) return null
  const ev = await getEvent(lookup)
  return ev?.id ?? null
}

watch(
  eventId,
  async () => {
    unsubscribeEvent()
    event.value = null
    ready.value = false

    const id = await resolveEventId()
    if (!id) {
      ready.value = true
      return
    }

    unsubscribeEvent = subscribeEvent(id, (ev) => {
      event.value = ev
      ready.value = true
    })
  },
  { immediate: true },
)

onUnmounted(() => unsubscribeEvent())

async function onGetFeedback() {
  if (!event.value?.id || starting.value) return
  starting.value = true
  global.loading++
  try {
    await startEventFeedback(event.value.id)
  } catch (err) {
    global.dialog = {
      title: 'Get Feedback',
      content: err?.message ?? 'Operazione fallita.',
    }
  } finally {
    starting.value = false
    global.loading--
  }
}
</script>

<template>
  <div class="flex w-full max-w-3xl flex-col gap-8 px-4 pb-36 pt-2">
    <p
      v-if="!ready"
      class="text-center opacity-80"
    >
      Caricamento…
    </p>

    <template v-else-if="event">
      <header class="space-y-1 text-center">
        <h1 class="text-2xl font-semibold">
          {{ displayTitle }}
        </h1>
        <p class="whitespace-pre-line text-base">
          {{ displayDescription }}
        </p>
      </header>

      <button
        type="button"
        class="btn-primary mx-auto inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition disabled:opacity-50"
        :disabled="starting"
        @click="onGetFeedback"
      >
        Get Feedback
      </button>

      <ParticipationsFeedback :event-id="event.id" />
    </template>

    <p
      v-else
      class="text-center opacity-80"
    >
      Evento non trovato.
    </p>
  </div>
</template>
