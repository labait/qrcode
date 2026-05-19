<script setup>
import { onMounted, ref } from 'vue'
import QRCode from 'qrcode'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useGlobal } from '../composables/global.js'
import { absoluteUrl, formatTimestampFriendly } from '../utils.js'

const global = useGlobal()

const events = ref([])
/** @type {import('vue').Ref<Record<string, string>>} */
const qrDataUrlById = ref({})
/** @type {import('vue').Ref<string | null>} */
const copyFeedbackId = ref(null)

let copyDismissTimerId

function eventPublicUrl(docId) {
  return absoluteUrl(`/qrcodes/${docId}`)
}

async function buildQr(docId, text) {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      margin: 1,
      scale: 4,
      width: 180,
    })
    qrDataUrlById.value = { ...qrDataUrlById.value, [docId]: dataUrl }
  } catch (e) {
    console.error('[admin/events] QR fallito', docId, e)
  }
}

async function load() {
  global.loading++
  try {
    const snap = await getDocs(collection(db, 'events'))
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    events.value = list
    qrDataUrlById.value = {}
    await Promise.all(
      list.map((e) => buildQr(e.id, eventPublicUrl(e.id))),
    )
  } finally {
    global.loading--
  }
}

async function copyLink(docId, url) {
  try {
    await navigator.clipboard.writeText(url)
    copyFeedbackId.value = docId
    window.clearTimeout(copyDismissTimerId)
    copyDismissTimerId = window.setTimeout(() => {
      copyFeedbackId.value = null
    }, 1600)
  } catch (err) {
    console.error('[admin/events] copia fallback', err)
  }
}

onMounted(load)

function fmt(ts) {
  return formatTimestampFriendly(ts)
}
</script>

<template>
  <div class="flex w-full max-w-5xl flex-col gap-8 px-4 pb-36 pt-2">
    <header class="space-y-1 text-center">
      <h1 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Eventi
      </h1>
      <p class="text-base text-neutral-600 dark:text-neutral-400">
        QR codice e attributi pubblici della collezione
        <span class="font-mono text-sm">events</span>
      </p>
    </header>

    <p
      v-if="events.length === 0"
      class="text-center text-neutral-500"
    >
      Nessun evento in collezione.
    </p>

    <div v-else class="grid gap-8 sm:grid-cols-1 md:grid-cols-2">
      <article
        v-for="ev in events"
        :key="ev.id"
        class="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="shrink-0 rounded-lg bg-neutral-50 p-2 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
            <img
              v-if="qrDataUrlById[ev.id]"
              :src="qrDataUrlById[ev.id]"
              :alt="'QR · ' + (ev.title || ev.id)"
              class="mx-auto block h-[180px] w-[180px]"
              loading="lazy"
            />
            <div
              v-else
              class="flex h-[180px] w-[180px] items-center justify-center text-sm text-neutral-500"
            >
              QR…
            </div>
          </div>

          <div class="min-w-0 flex-1 space-y-2 self-stretch sm:pl-2">
            <div class="flex items-start gap-2">
              <a
                :href="eventPublicUrl(ev.id)"
                target="_blank"
                rel="noopener noreferrer"
                class="min-w-0 flex-1 break-all text-xs font-mono leading-snug text-blue-700 hover:underline dark:text-blue-400"
              >
                {{ eventPublicUrl(ev.id) }}
              </a>
              <button
                type="button"
                class="shrink-0 rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
                aria-label="Copia link negli appunti"
                @click="copyLink(ev.id, eventPublicUrl(ev.id))"
              >
                {{ copyFeedbackId === ev.id ? 'Copiato' : 'Copia' }}
              </button>
            </div>

            <dl class="space-y-2 text-base text-neutral-800 dark:text-neutral-200">
              <div class="flex flex-col gap-0.5">
                <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  title
                </dt>
                <dd class="leading-snug">
                  {{ ev.title ?? '—' }}
                </dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  description
                </dt>
                <dd class="whitespace-pre-line leading-snug">
                  {{ ev.description ?? '—' }}
                </dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  valid_from
                </dt>
                <dd>
                  {{ fmt(ev.valid_from) }}
                </dd>
              </div>
              <div class="flex flex-col gap-0.5">
                <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  valid_to
                </dt>
                <dd>
                  {{ fmt(ev.valid_to) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
