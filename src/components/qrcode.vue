<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  /** Tipicamente un URL assoluto da codificare nel QR. */
  content: {
    type: String,
    default: '',
  },
})

const dataUrl = ref('')

async function renderQr() {
  const text = typeof props.content === 'string' ? props.content.trim() : ''
  if (!text) {
    dataUrl.value = ''
    return
  }
  try {
    dataUrl.value = await QRCode.toDataURL(text, {
      margin: 1,
      scale: 4,
      width: 200,
    })
  } catch (e) {
    console.error('[qrcode] generazione fallita', e)
    dataUrl.value = ''
  }
}

watch(() => props.content, renderQr, { immediate: true })
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <div
      v-if="dataUrl"
      class=""
    >
      <img
        :src="dataUrl"
        alt="Codice QR"
        class="h-[300px] w-[300px] object-contain"
        width="200"
        height="200"
        loading="lazy"
      />
    </div>
    <p
      v-if="content"
      class="max-w-full break-all text-center  font-mono opacity-85"
    >
    </p>
  </div>
</template>
