<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, createParticipation } from '../firebase.js'
import { getEvent, verifyCurrentParticipation, LS_KEY_QRCODE_URL } from '../utils.js'
import { useGlobal } from '../composables/global.js'
import EventCard from '../components/Event.vue'

const route = useRoute()
const router = useRouter()
const global = useGlobal()

const event = ref(null)
const loading = ref(true)
/** True se esiste già una partecipazione senza `ended_at` per questo evento/lookup (utente loggato). */
const hasActiveParticipation = ref(false)
/** Evita di riaprire il dialog se è già stato mostrato (stesso utente, stessa pagina). */
let showedActiveParticipationDialog = false

let unsubscribeAuth = () => {}
/** @type {string | null | undefined} */
let lastAuthUid = undefined

/** Stesso valore del parametro route usato da `getEvent` / `verifyCurrentParticipation`. */
function routeLookupStr() {
  return String(route.params.id ?? '').trim()
}

function openNotFoundDialog() {
  global.dialog = {
    title: 'Errore',
    content: 'codice non trovato',
    onOk: () => {
      global.dialog = null
      router.replace({ name: 'home' })
    },
    onCancel: () => {
      global.dialog = null
    },
  }
}

/**
 * All’apertura (e al login): `verifyCurrentParticipation(str, uid)` con la stringa di route.
 */
async function checkActiveParticipationOnOpen() {
  const key = routeLookupStr()

  if (!event.value || !key) {
    hasActiveParticipation.value = false
    return
  }
  await auth.authStateReady()
  const u = auth.currentUser
  if (!u) {
    hasActiveParticipation.value = false
    return
  }

  const active = await verifyCurrentParticipation(key, u.uid)
  hasActiveParticipation.value = !!active

  if (active && !showedActiveParticipationDialog) {
    showedActiveParticipationDialog = true
    global.dialog = {
      title: 'Partecipazione',
      content: 'Partecipazione già attiva',
      onOk: async () => {
        global.dialog = null
        await router.replace({
          name: 'participationDetail',
          params: { id: active.id },
        })
      },
      onCancel: () => {
        global.dialog = null
      },
    }
  }
}

async function load() {
  loading.value = true
  event.value = null
  hasActiveParticipation.value = false
  showedActiveParticipationDialog = false

  const param = routeLookupStr()
  const ev = await getEvent(param)
  event.value = ev
  loading.value = false

  if (!ev) {
    openNotFoundDialog()
    return
  }

  await checkActiveParticipationOnOpen()
}

function goHome() {
  router.replace({ name: 'home' })
}

onMounted(() => {
  load()
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    const uid = user?.uid ?? null
    if (uid !== lastAuthUid) {
      showedActiveParticipationDialog = false
      lastAuthUid = uid
    }
    if (event.value) {
      void checkActiveParticipationOnOpen()
    }
  })
})

onUnmounted(() => {
  unsubscribeAuth()
})

watch(
  () => route.params.id,
  () => load(),
)

async function onPartecipa() {
  if (!event.value) return

  await auth.authStateReady()
  const u = auth.currentUser
  if (!u) {
    const id = routeLookupStr()
    if (id) {
      try {
        localStorage.setItem(LS_KEY_QRCODE_URL, id)
      } catch (e) {
        console.warn('[EventView] localStorage qrcode_url', e)
      }
    }
    router.push({ name: 'login' })
    return
  }

  if (hasActiveParticipation.value) {
    return
  }

  const key = routeLookupStr()

  global.loading++
  try {
    const active = await verifyCurrentParticipation(key, u.uid)
    if (active) {
      hasActiveParticipation.value = true
      await router.replace({
        name: 'participationDetail',
        params: { id: active.id },
      })
      return
    }

    const p = await createParticipation(u.uid, event.value.id)
    if (!p?.id) return

    global.event = event.value
    global.participation = p

    await router.replace({
      name: 'participationDetail',
      params: { id: p.id },
    })
  } catch (e) {
    console.error('[EventView] partecipa', e)
  } finally {
    global.loading--
  }
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-8 px-4 py-6">
    <p
      v-if="loading"
      class="text-base opacity-85"
    >
      Caricamento…
    </p>

    <template v-else-if="event">
      <EventCard :event="event" />

      <a
        v-if="!hasActiveParticipation"
        href="#"
        class="bg-primary inline-flex w-full cursor-pointer items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition"
        @click.prevent="onPartecipa"
      >
        Partecipa
      </a>
      <p
        v-else
        class="max-w-md text-center text-base opacity-90"
      >
        Hai già una partecipazione attiva per questo evento.
      </p>
    </template>

    <div
      v-else
      class="flex max-w-md flex-col items-center gap-4 text-center"
    >
      <p class="text-base">
        codice non trovato
      </p>
      <button
        type="button"
        class="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        @click="goHome"
      >
        Torna alla home
      </button>
    </div>
  </div>
</template>
