<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, ensureUserAccount, getAccountByUid } from '../firebase.js'
import { LS_KEY_QRCODE_URL, normalizeStoredQrcodeResume } from '../utils.js'

import { useGlobal } from '../composables/global.js'

const global = useGlobal()
const route = useRoute()
const router = useRouter()

const user = ref(null)

const showAccediLink = computed(
  () => !user.value && route.path !== '/login',
)

/** Microsoft spesso non popola `photoURL`; si provano anche i provider allegati. */
const avatarUrl = computed(() => {
  const u = user.value
  if (!u) return ''
  if (u.photoURL) return u.photoURL
  const fromProvider = u.providerData?.find((p) => p?.photoURL)?.photoURL
  return fromProvider ?? ''
})

const initials = computed(() => {
  const u = user.value
  if (!u) return ''
  const name = u.displayName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const email = u.email ?? ''
  if (email.length >= 2) return email.slice(0, 2).toUpperCase()
  return '?'
})

let unsubscribeAuth = () => {}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
    global.loading++
    user.value = u
    if (!u) {
      global.account = null
      global.loading--
      return
    }
    try {
      await ensureUserAccount(u)
      global.account = await getAccountByUid(u.uid)

      let pendingRaw = null
      try {
        pendingRaw = localStorage.getItem(LS_KEY_QRCODE_URL)
      } catch (e) {
        console.warn('[Auth] localStorage get qrcode_url', e)
      }
      const trimmed =
        pendingRaw != null && String(pendingRaw).trim() !== ''
          ? String(pendingRaw).trim()
          : ''

      if (trimmed !== '') {
        try {
          localStorage.removeItem(LS_KEY_QRCODE_URL)
        } catch (e) {
          console.warn('[Auth] localStorage remove qrcode_url', e)
        }

        const norm = normalizeStoredQrcodeResume(trimmed)
        if (norm?.type === 'internalPath') {
          await router.replace(norm.path)
          return
        }
        if (norm?.type === 'externalHref') {
          window.location.assign(norm.href)
          return
        }
        if (norm?.type === 'legacyId') {
          await router.replace({
            name: 'eventQrcode',
            params: { id: norm.id },
          })
          return
        }
      }
      if (route.name === 'login') {
        await router.replace({ name: 'home' })
      }
    } finally {
      global.loading--
    }
  })
})

onUnmounted(() => {
  unsubscribeAuth()
})

async function logout() {
  await firebaseSignOut(auth)
  await router.replace({ name: 'home' })
}
</script>

<template>
  <header class="w-full shrink-0 py-2">
    <div
      class="mx-auto flex w-full max-w-5xl justify-center gap-3 px-4"
    >
      <template v-if="!user">
        <RouterLink
          v-if="showAccediLink"
          to="/login"
          class="bg-primary inline-flex items-center justify-center rounded-lg px-5 py-2 text-base font-medium transition"
        >
          Esegui l'accesso
        </RouterLink>
      </template>
      <template v-else>
        <div
          class="flex max-w-full flex-nowrap items-center gap-2 sm:gap-3"
          role="group"
          aria-label="Profilo utente"
        >
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="user.displayName || user.email || 'Utente'"
            class="size-10 shrink-0 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700 sm:size-11"
            referrerpolicy="no-referrer"
            width="40"
            height="40"
            loading="lazy"
          />
          <div
            v-else
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-neutral-600 to-neutral-800 text-sm font-semibold text-white ring-2 ring-neutral-300 sm:size-11 sm:text-base dark:from-neutral-500 dark:to-neutral-700 dark:ring-neutral-600"
            aria-hidden="true"
          >
            {{ initials }}
          </div>
          <span
            class="min-w-0 max-w-[14rem] shrink truncate whitespace-nowrap text-left text-base font-medium sm:max-w-xs"
          >
            {{ user.displayName || user.email || 'Utente' }}
          </span>
          <button
            type="button"
            class="inline-flex shrink-0 whitespace-nowrap text-base font-medium underline-offset-2 hover:underline"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </template>
    </div>
  </header>
</template>
