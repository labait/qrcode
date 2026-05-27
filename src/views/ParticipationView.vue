<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  auth,
  endParticipation,
  subscribeEvent,
  subscribeParticipation,
} from '../firebase.js'
import { useGlobal } from '../composables/global.js'
import Event from '../components/Event.vue'
import ParticipationFeedbackForm from '../components/ParticipationFeedbackForm.vue'

const route = useRoute()
const router = useRouter()
const global = useGlobal()

const event = ref(null)
const participation = ref(null)
const ready = ref(false)

let unsubscribeParticipation = () => {}
let unsubscribeEvent = () => {}
let subscribedEventId = null
let showedInactiveDialog = false

const participationId = computed(() => String(route.params.id ?? '').trim())

const showFeedbackForm = computed(() => {
  const uid = auth.currentUser?.uid
  if (!uid || !participation.value || !event.value) return false
  if (participation.value.uid !== uid) return false
  if (event.value.get_feedback !== true) return false
  if (participation.value.feedback) return false
  return true
})

function bindEvent(eventId) {
  if (subscribedEventId === eventId) return
  subscribedEventId = eventId
  unsubscribeEvent()
  event.value = null
  if (!eventId) {
    ready.value = true
    return
  }
  unsubscribeEvent = subscribeEvent(eventId, (ev) => {
    event.value = ev
    global.event = ev
    ready.value = true
  })
}

async function setupSubscriptions() {
  unsubscribeParticipation()
  unsubscribeEvent()
  subscribedEventId = null
  showedInactiveDialog = false
  event.value = null
  participation.value = null
  ready.value = false

  await auth.authStateReady()
  const u = auth.currentUser
  if (!u) {
    await router.replace({ name: 'login' })
    return
  }

  const id = participationId.value
  if (!id) {
    ready.value = true
    return
  }

  unsubscribeParticipation = subscribeParticipation(id, (p) => {
    if (!p || p.uid !== u.uid) {
      participation.value = null
      bindEvent(null)
      ready.value = true
      return
    }

    if (p.ended_at != null) {
      participation.value = null
      bindEvent(null)
      ready.value = true
      if (!showedInactiveDialog) {
        showedInactiveDialog = true
        global.dialog = {
          title: 'Partecipazione',
          content: 'Questa partecipazione non è più attiva.',
          onOk: async () => {
            global.dialog = null
            await router.replace({
              name: 'eventQrcode',
              params: { id: p.event_id },
            })
          },
          onCancel: () => {
            global.dialog = null
          },
        }
      }
      return
    }

    participation.value = p
    global.participation = p
    bindEvent(String(p.event_id ?? '').trim())
  })
}

watch(participationId, () => setupSubscriptions(), { immediate: true })
onUnmounted(() => {
  unsubscribeParticipation()
  unsubscribeEvent()
})

async function finePartecipazione() {
  const id = participation.value?.id
  if (!id) return
  global.loading++
  try {
    await endParticipation(id)
    global.participation = null
    global.event = null
    await router.replace({ name: 'home' })
  } catch (e) {
    console.error('[ParticipationView] fine', e)
  } finally {
    global.loading--
  }
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-8 px-4 py-6">
    <p
      v-if="!ready"
      class="text-base opacity-80"
    >
      Caricamento…
    </p>

    <template v-else-if="event && participation">
      <div class="flex w-full max-w-lg flex-col gap-6">
        <a
          href="#"
          class="btn-secondary inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition"
          @click.prevent="finePartecipazione"
        >
          Fine partecipazione
        </a>
        <Event :event="event" />
      </div>

      <ParticipationFeedbackForm
        v-if="showFeedbackForm"
        :participation-id="participation.id"
      />
    </template>

    <p
      v-else
      class="text-center text-base opacity-80"
    >
      Evento non disponibile.
    </p>
  </div>
</template>
