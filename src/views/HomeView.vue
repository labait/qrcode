<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase.js'
import { verifyAnyParticipation } from '../utils.js'

const router = useRouter()

onMounted(async () => {
  await auth.authStateReady()
  const u = auth.currentUser
  if (!u) return

  const p = await verifyAnyParticipation(u.uid)
  if (!p) return

  await router.replace({
    name: 'participationDetail',
    params: { id: p.id },
  })
})
</script>

<template>
  <div class="text-center">
    <p class="max-w-md text-lg">
      Scansionare un QR code
    </p>
  </div>
</template>
