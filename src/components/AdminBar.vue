<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import { useGlobal } from '../composables/global.js'
import { getParticipationById, isAdmin } from '../firebase.js'
import { auth } from '../firebase.js'
import { getEvent, getSpreadsheetIdForEvent } from '../utils.js'

const global = useGlobal()
const route = useRoute()

const isAdminUser = computed(() => isAdmin(global.account))
const onExportableRoute = computed(
  () => route.name === 'eventQrcode' || route.name === 'participationDetail',
)
const visible = computed(() => isAdminUser.value)
const showExportLink = computed(() => isAdminUser.value && onExportableRoute.value)

async function exportParticipations() {
  const lookup = String(route.params.id ?? '').trim()
  if (!lookup) return

  global.loadingText = 'Exporting to Google Spreadsheet, please wait...'
  global.loading++
  try {
    let eventLookup = lookup

    if (route.name === 'participationDetail') {
      const participation = await getParticipationById(lookup)
      const eventIdFromParticipation = String(participation?.event_id ?? '').trim()
      if (!eventIdFromParticipation) {
        global.dialog = {
          title: 'Export',
          content: 'Partecipazione non trovata o senza event_id.',
        }
        return
      }
      eventLookup = eventIdFromParticipation
    }

    const event = await getEvent(eventLookup)
    if (!event?.id) {
      global.dialog = {
        title: 'Export',
        content: 'Evento non trovato.',
      }
      return
    }

    const spreadsheetId = getSpreadsheetIdForEvent(event)
    if (!spreadsheetId) {
      global.dialog = {
        title: 'Export',
        content: 'Spreadsheet non configurato (VITE_GOOGLE_SPREADSHEET_ID o event.spreadsheet_id).',
      }
      return
    }

    await auth.authStateReady()
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) {
      global.dialog = {
        title: 'Export',
        content: 'Utente non autenticato.',
      }
      return
    }

    const response = await fetch('/.netlify/functions/export-event-participations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        eventId: event.id,
        spreadsheetId,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error || 'Errore durante export')
    }

    const updatedRows = Number(payload?.rowsWritten ?? 0)
    const spreadsheetUrl = String(payload?.spreadsheetUrl ?? '').trim()
    const sheetTitle = String(payload?.sheetTitle ?? '').trim()
    global.dialog = {
      title: 'Export completato',
      content: `Esportazione completata. Righe salvate: ${updatedRows}.`,
      link: spreadsheetUrl
        ? {
            href: spreadsheetUrl,
            label: sheetTitle
              ? `Apri foglio "${sheetTitle}" su Google Spreadsheet`
              : 'Apri Google Spreadsheet',
          }
        : undefined,
    }
  } catch (err) {
    global.dialog = {
      title: 'Export fallito',
      content: err?.message ?? 'Errore imprevisto durante export.',
    }
  } finally {
    global.loading--
    if (global.loading === 0) global.loadingText = null
  }
}
</script>

<template>
  <nav
    v-if="visible"
    class="pointer-events-auto fixed bottom-4 left-4 z-40"
    aria-label="Barra amministratore"
  >
    <div
      class="flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg bg-black/80"
    >
      <Cog6ToothIcon
        class="size-5 shrink-0 text-white dark:text-white"
        aria-hidden="true"
      />
      <RouterLink
        to="/admin/events"
        class="rounded-md px-1 text-base font-medium text-white underline-offset-4 transition hover:underline dark:text-white"
      >
        Events
      </RouterLink>
      <button
        v-if="showExportLink"
        type="button"
        class="rounded-md px-1 text-base font-medium text-white underline-offset-4 transition hover:underline dark:text-white"
        @click="exportParticipations"
      >
        Export
      </button>
    </div>
  </nav>
</template>
