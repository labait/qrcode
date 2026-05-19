<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  auth,
  getParticipationById,
  endParticipation,
} from '../firebase.js'
import { getEvent } from '../utils.js'
import { useGlobal } from '../composables/global.js'
import Event from '../components/Event.vue'

const route = useRoute()
const router = useRouter()
const global = useGlobal()

const event = ref(null)
const participation = ref(null)
const ready = ref(false)

async function load() {
  ready.value = false
  global.loading++
  try {
    await auth.authStateReady()
    const u = auth.currentUser
    if (!u) {
      await router.replace({ name: 'login' })
      return
    }

    const id = String(route.params.id ?? '')
    const p = await getParticipationById(id)
    if (!p || p.uid !== u.uid) {
      global.dialog = {
        title: 'Errore',
        content: 'Partecipazione non trovata.',
        onOk: () => {
          global.dialog = null
          router.replace({ name: 'home' })
        },
        onCancel: () => {
          global.dialog = null
        },
      }
      participation.value = null
      event.value = null
      return
    }

    if (p.ended_at != null) {
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
      participation.value = null
      event.value = null
      return
    }

    participation.value = p
    global.participation = p

    const ev = await getEvent(p.event_id)
    event.value = ev
    global.event = ev
  } finally {
    global.loading--
    ready.value = true
  }
}

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

onMounted(load)
watch(
  () => route.params.id,
  () => load(),
)
</script>

<template>
  <div class="flex w-full flex-col items-center gap-8 px-4 py-6">
    <p
      v-if="!ready"
      class="text-base opacity-80"
    >
      Caricamento…
    </p>

    <template v-else-if="event">
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
    </template>

    <p
      v-else
      class="text-center text-base opacity-80"
    >
      Evento non disponibile.
    </p>
  </div>
</template>
