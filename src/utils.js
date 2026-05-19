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
