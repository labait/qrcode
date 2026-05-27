<script setup>
import { ref } from 'vue'
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
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div class="w-full max-w-sm rounded-lg bg-white p-6 text-black shadow-xl">
        <h2
          id="feedback-title"
          class="text-center text-xl font-semibold"
        >
          Feedback?
        </h2>

        <div class="mt-6 flex justify-center gap-3">
          <button
            type="button"
            class="rounded-md bg-green-600 px-6 py-2 text-base font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            :disabled="submitting"
            @click="submit('ok')"
          >
            Sì
          </button>
          <button
            type="button"
            class="rounded-md bg-red-600 px-6 py-2 text-base font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            :disabled="submitting"
            @click="submit('ko')"
          >
            No
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
