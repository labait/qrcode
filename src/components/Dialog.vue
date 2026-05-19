<script setup>
import { useGlobal } from '../composables/global.js'

const global = useGlobal()

async function handleOk() {
  try {
    if (typeof global.dialog?.onOk === 'function') {
      await global.dialog.onOk()
    }
  } finally {
    global.dialog = null
  }
}

async function handleCancel() {
  try {
    if (typeof global.dialog?.onCancel === 'function') {
      await global.dialog.onCancel()
    }
  } finally {
    global.dialog = null
  }
}
</script>

<template>
  <div
    v-if="global.dialog?.content != null"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
  >
    <div
      class="w-full max-w-[90vw] sm:max-w-[50vw] rounded-lg bg-white p-6 text-black shadow-xl"
    >
      <h2
        v-if="global.dialog?.title"
        class="mb-2 text-xl font-semibold"
      >
        {{ global.dialog.title }}
      </h2>

      <p class="whitespace-pre-line">
        {{ global.dialog.content }}
      </p>

      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-md border border-neutral-300 bg-neutral-100 px-4 py-2 text-neutral-700 hover:bg-neutral-200"
          @click="handleCancel"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          @click="handleOk"
        >
          Ok
        </button>
      </div>
    </div>
  </div>
</template>