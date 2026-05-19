import { db } from './firebase.js'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore'

/** Ripresa dopo login: URL della pagina evento QR vista dall’utente (`window.location.href`). */
export const LS_KEY_POST_LOGIN_URL = 'post_login_return_url'

const COLLECTION_EVENTS = 'events'
const COLLECTION_PARTICIPATIONS = 'participations'

/** Base assoluto dell’app (es. `https://apps.example.com` senza slash finale). */
function baseUrlEnv() {
  const raw = import.meta.env?.VITE_BASE_URL
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.replace(/\/$/, '')
  }
  /** In dev, se `.env` non è impostato, resta leggibile usando l’origine corrente. */
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}

/**
 * @param {string} path Percorso relativo (meglio che inizi con `/`, es. `/qrcodes/abc`).
 * @returns {string} URL assoluto usando `VITE_BASE_URL`.
 */
export function absoluteUrl(path) {
  const base = baseUrlEnv()
  const normalized =
    typeof path === 'string' ? (path.startsWith('/') ? path : `/${path}`) : ''
  return `${base}${normalized}`
}

/** Salva l’URL corrente (pagina QR) per il redirect dopo l’accesso. */
export function persistCurrentPageUrlAfterLogin() {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY_POST_LOGIN_URL, window.location.href)
  } catch (e) {
    console.warn('[utils] persistCurrentPageUrlAfterLogin', e)
  }
}

/**
 * Timestamp Firestore o simile → leggibile (`Intl.DateTimeFormat`).
 * @param {unknown} ts Firestore Timestamp, `{ seconds }`, Date, Epoch ms …
 * @param {Intl.LocalesArgument} [locale='it-IT']
 */
export function formatTimestampFriendly(ts, locale = 'it-IT') {
  const d = toJsDate(ts)
  if (!d || Number.isNaN(d.getTime())) return '—'
  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  return fmt.format(d)
}

/** @internal */
function toJsDate(ts) {
  if (ts == null) return null
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  if (typeof ts === 'number' && Number.isFinite(ts)) return new Date(ts)
  if (typeof ts === 'object' && typeof ts.seconds === 'number') {
    const ms =
      typeof ts.nanoseconds === 'number'
        ? ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1e6)
        : ts.seconds * 1000
    return new Date(ms)
  }
  return null
}

// ----- Eventi & partecipazioni (Firestore, centralizzato) -----

/**
 * Cerca un documento nella collezione `events`:
 * 1) `events/{str}` se esiste;
 * 2) primo documento con campo `id` uguale a `str`;
 * 3) primo documento con campo `code` uguale a `str`.
 * @param {string | null | undefined} str
 * @returns {Promise<object | null>} `{ id, …fields }` con `id` = id documento Firestore
 */
export async function getEvent(str) {
  if (str == null || String(str).trim() === '') return null
  const trimmed = String(str).trim()

  const direct = await getDoc(doc(db, COLLECTION_EVENTS, trimmed))
  if (direct.exists()) {
    return { ...direct.data(), id: direct.id }
  }

  const qByFieldId = query(
    collection(db, COLLECTION_EVENTS),
    where('id', '==', trimmed),
    limit(1),
  )
  const snapId = await getDocs(qByFieldId)
  if (!snapId.empty) {
    const d = snapId.docs[0]
    return { ...d.data(), id: d.id }
  }

  const qByCode = query(
    collection(db, COLLECTION_EVENTS),
    where('code', '==', trimmed),
    limit(1),
  )
  const snapCode = await getDocs(qByCode)
  if (!snapCode.empty) {
    const d = snapCode.docs[0]
    return { ...d.data(), id: d.id }
  }

  return null
}

/** @param {unknown} ts */
function timestampMs(ts) {
  if (ts == null) return 0
  if (typeof ts.toDate === 'function') return ts.toDate().getTime()
  if (typeof ts === 'object' && typeof ts.seconds === 'number') {
    const ns = typeof ts.nanoseconds === 'number' ? ts.nanoseconds / 1e6 : 0
    return ts.seconds * 1000 + ns
  }
  return 0
}

/**
 * Tra tutte le partecipazioni per `uid` e l’evento risolto da `str` (`getEvent`)
 * senza `ended_at`, restituisce la più recente per `created_at` (discendente).
 * @param {string | null | undefined} str Chiave per `getEvent` (id documento, campo `id`, o `code`)
 * @param {string | null | undefined} uid
 * @returns {Promise<object | null>} `{ id, … }` o null
 */
export async function verifyCurrentParticipation(str, uid) {
  if (uid == null || String(uid).trim() === '') return null

  const ev = await getEvent(str)
  if (!ev?.id) return null

  const qRef = query(
    collection(db, COLLECTION_PARTICIPATIONS),
    where('uid', '==', uid),
    where('event_id', '==', ev.id),
    limit(80),
  )
  const snap = await getDocs(qRef)

  const active = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.ended_at == null)
    .sort(
      (a, b) => timestampMs(b.created_at) - timestampMs(a.created_at),
    )

  return active[0] ?? null
}
