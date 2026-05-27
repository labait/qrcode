<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import { subscribeEventParticipations } from '../firebase.js'
import { formatTimestampFriendly } from '../utils.js'

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
})

const participations = ref([])
let unsubscribe = () => {}

function participationName(p) {
  const last = String(p.lastname ?? '').trim()
  const first = String(p.firstname ?? '').trim()
  const full = [last, first].filter(Boolean).join(' ')
  return full || '—'
}

watch(
  () => props.eventId,
  (eventId) => {
    unsubscribe()
    participations.value = []
    if (!eventId) return
    unsubscribe = subscribeEventParticipations(eventId, (list) => {
      participations.value = [...list].sort((a, b) =>
        participationName(a).localeCompare(participationName(b), 'it', { sensitivity: 'base' }),
      )
    })
  },
  { immediate: true },
)

onUnmounted(() => unsubscribe())

const total = computed(() => participations.value.length)

const feedbackStats = computed(() => {
  const counts = new Map()
  for (const p of participations.value) {
    const key = p.feedback == null || p.feedback === '' ? 'pending' : String(p.feedback)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].map(([value, count]) => ({
    value,
    count,
    percent: total.value ? Math.round((count / total.value) * 100) : 0,
  }))
})

function feedbackLabel(value) {
  if (value === 'ok') return 'ok'
  if (value === 'ko') return 'ko'
  if (value === 'pending') return 'pending'
  return value
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="space-y-2 text-base">
      <p>
        <span class="font-semibold">Participations:</span>
        {{ total }}
      </p>
      <div>
        <p class="font-semibold">
          Feedbacks:
        </p>
        <ul class="mt-1 space-y-1">
          <li
            v-for="stat in feedbackStats"
            :key="stat.value"
          >
            {{ feedbackLabel(stat.value) }}: {{ stat.count }} ({{ stat.percent }}%)
          </li>
        </ul>
      </div>
    </div>

    <div
      class="grid w-full gap-x-3 gap-y-2 text-sm font-semibold uppercase tracking-wide opacity-75"
      style="grid-template-columns: 2fr 1.5fr 0.5fr"
    >
      <span>name</span>
      <span>updated_at</span>
      <span class="text-center">feedback</span>
    </div>

    <div class="flex flex-col gap-2">
      <div
        v-for="p in participations"
        :key="p.id"
        class="grid w-full items-center gap-x-3 gap-y-1 rounded-lg bg-black/5 px-3 py-2 text-base"
        style="grid-template-columns: 2fr 1.5fr 0.5fr"
      >
        <span class="leading-snug">{{ participationName(p) }}</span>
        <span class="text-sm">{{ formatTimestampFriendly(p.updated_at) }}</span>
        <span class="flex justify-center">
          <CheckIcon
            v-if="p.feedback === 'ok'"
            class="size-6 text-green-600"
            aria-label="ok"
          />
          <XMarkIcon
            v-else-if="p.feedback === 'ko'"
            class="size-6 text-red-600"
            aria-label="ko"
          />
          <span
            v-else
            class="opacity-50"
          >—</span>
        </span>
      </div>
    </div>

    <p
      v-if="participations.length === 0"
      class="text-center opacity-80"
    >
      Nessuna partecipazione.
    </p>
  </div>
</template>
