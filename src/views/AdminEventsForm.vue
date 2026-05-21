<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { useGlobal } from '../composables/global.js'

const route = useRoute()
const router = useRouter()
const global = useGlobal()

const isEdit = computed(() => route.name === 'adminEventEdit')
const eventId = computed(() => String(route.params.id ?? '').trim())

const form = reactive({
  code: '',
  title: '',
  description: '',
  valid_from: '',
  valid_to: '',
})

const ready = ref(false)

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateFromAny(ts) {
  if (ts == null) return null
  if (ts instanceof Date) return ts
  if (typeof ts?.toDate === 'function') return ts.toDate()
  if (typeof ts === 'object' && typeof ts.seconds === 'number') {
    const ms =
      typeof ts.nanoseconds === 'number'
        ? ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1e6)
        : ts.seconds * 1000
    return new Date(ms)
  }
  if (typeof ts === 'number' && Number.isFinite(ts)) return new Date(ts)
  return null
}

function toDatetimeLocalValue(ts) {
  const d = toDateFromAny(ts)
  if (!d || Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function toNullableDate(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d
}

async function loadForEdit() {
  if (!isEdit.value) {
    ready.value = true
    return
  }

  if (!eventId.value) {
    global.dialog = {
      title: 'Evento',
      content: 'ID evento mancante.',
      onOk: async () => {
        global.dialog = null
        await router.replace({ name: 'adminEvents' })
      },
      onCancel: () => {
        global.dialog = null
      },
    }
    ready.value = true
    return
  }

  global.loading++
  try {
    const snap = await getDoc(doc(db, 'events', eventId.value))
    if (!snap.exists()) {
      global.dialog = {
        title: 'Evento',
        content: 'Evento non trovato.',
        onOk: async () => {
          global.dialog = null
          await router.replace({ name: 'adminEvents' })
        },
        onCancel: () => {
          global.dialog = null
        },
      }
      return
    }

    const ev = snap.data()
    form.code = String(ev.code ?? '')
    form.title = String(ev.title ?? '')
    form.description = String(ev.description ?? '')
    form.valid_from = toDatetimeLocalValue(ev.valid_from)
    form.valid_to = toDatetimeLocalValue(ev.valid_to)
  } finally {
    global.loading--
    ready.value = true
  }
}

async function save() {
  const payload = {
    code: String(form.code ?? '').trim(),
    title: String(form.title ?? '').trim(),
    description: String(form.description ?? '').trim(),
    valid_from: toNullableDate(form.valid_from),
    valid_to: toNullableDate(form.valid_to),
  }

  if (!payload.code || !payload.title) {
    global.dialog = {
      title: 'Validazione',
      content: 'I campi code e title sono obbligatori.',
    }
    return
  }

  global.loading++
  try {
    if (isEdit.value) {
      await updateDoc(doc(db, 'events', eventId.value), payload)
    } else {
      await addDoc(collection(db, 'events'), payload)
    }

    await router.replace({ name: 'adminEvents' })
  } catch (err) {
    global.dialog = {
      title: 'Salvataggio fallito',
      content: err?.message ?? 'Errore imprevisto durante il salvataggio.',
    }
  } finally {
    global.loading--
  }
}

onMounted(() => {
  void loadForEdit()
})
</script>

<template>
  <div class="flex w-full flex-col gap-6 px-4 pb-36 pt-2">
    <header class="space-y-1 text-center">
      <h1 class="text-2xl font-semibold">
        {{ isEdit ? 'Edit event' : 'Add event' }}
      </h1>
      <p class="text-base opacity-85">
        Compila i campi dell'evento.
      </p>
    </header>

    <p
      v-if="!ready"
      class="text-center opacity-80"
    >
      Caricamento…
    </p>

    <form
      v-else
      class="space-y-5 rounded-2xl bg-white p-5 shadow-md dark:bg-neutral-800"
      @submit.prevent="save"
    >
      <label class="block space-y-2">
        <span class="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">code</span>
        <input
          v-model="form.code"
          type="text"
          class="w-full rounded-md border-2 border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none ring-offset-2 transition placeholder-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-400/50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-500/50"
          placeholder="es. TECH2024"
          required
        >
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">title</span>
        <input
          v-model="form.title"
          type="text"
          class="w-full rounded-md border-2 border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none ring-offset-2 transition placeholder-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-400/50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-500/50"
          placeholder="es. Conferenza Tecnologia 2024"
          required
        >
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">description</span>
        <textarea
          v-model="form.description"
          rows="4"
          class="w-full rounded-md border-2 border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none ring-offset-2 transition placeholder-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-400/50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-500/50"
          placeholder="Descrizione evento..."
        />
      </label>
      <label class="block space-y-2">
        <span class="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">valid_from</span>
        <input
          v-model="form.valid_from"
          type="datetime-local"
          class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none ring-offset-2 transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950"
        >
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-semibold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">valid_to</span>
        <input
          v-model="form.valid_to"
          type="datetime-local"
          class="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none ring-offset-2 transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950"
        >
      </label>

      <div class="flex items-center justify-end gap-3 pt-2">
        <RouterLink
          :to="{ name: 'adminEvents' }"
          class="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Annulla
        </RouterLink>
        <button
          type="submit"
          class="rounded-lg bg-black px-4 py-2 text-base font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Salva
        </button>
      </div>
    </form>
  </div>
</template>
