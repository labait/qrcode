<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase.js'
import { verifyCurrentParticipation } from '../utils.js'
import { useGlobal } from '../composables/global.js'

const router = useRouter()
const global = useGlobal()

/** Stringa passata a `getEvent` / `verifyCurrentParticipation` per la home (es. `code` o id documento). */
const homeEventLookup = (import.meta.env.VITE_HOME_EVENT_LOOKUP ?? '').trim()

onMounted(async () => {
  if (!homeEventLookup) {
    return
  }

  await auth.authStateReady()
  const u = auth.currentUser
  if (!u) return

  const p = await verifyCurrentParticipation(homeEventLookup, u.uid)
  if (!p) return

  global.dialog = {
    title: 'Partecipazione',
    content: 'Partecipazione già attiva',
    onOk: async () => {
      global.dialog = null
      await router.replace({
        name: 'participationDetail',
        params: { id: p.id },
      })
    },
    onCancel: () => {
      global.dialog = null
    },
  }
})
</script>

<template>
  <div
    class="text-center"
  >
    <p class="max-w-md text-lg">
      Scansionare un QR code
    </p>
  </div>
</template>
