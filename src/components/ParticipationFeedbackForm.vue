<script setup>
import { ref } from 'vue'
import { ChartBarSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { setParticipationFeedback } from '../firebase.js'
import { useGlobal } from '../composables/global.js'

const props = defineProps({
  participationId: {
    type: String,
    required: true,
  },
})

const global = useGlobal()
const submitting = ref(false)

async function submit(feedback) {
  if (submitting.value) return
  submitting.value = true
  global.loading++
  try {
    await setParticipationFeedback(props.participationId, feedback)
  } catch (err) {
    global.dialog = {
      title: 'Feedback',
      content: err?.message ?? 'Invio feedback fallito.',
    }
  } finally {
    submitting.value = false
    global.loading--
  }
}
</script>

<template>
  <div class="flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl bg-black/5 p-6">
    <ChartBarSquareIcon
      class="size-10 opacity-80"
      aria-hidden="true"
    />
    <p class="text-center text-base">
      Come valuti l'evento?
    </p>
    <div class="flex items-center justify-center gap-4">
      <button
        type="button"
        class="inline-flex size-14 items-center justify-center rounded-full border border-green-600 bg-white text-green-600 transition hover:bg-green-50 disabled:opacity-50"
        :disabled="submitting"
        aria-label="Feedback ok"
        @click="submit('ok')"
      >
        <CheckIcon class="size-8" />
      </button>
      <button
        type="button"
        class="inline-flex size-14 items-center justify-center rounded-full border border-red-600 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        :disabled="submitting"
        aria-label="Feedback ko"
        @click="submit('ko')"
      >
        <XMarkIcon class="size-8" />
      </button>
    </div>
  </div>
</template>
