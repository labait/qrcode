/**
 * Lista provider di accesso dalla variabile ambiente `VITE_ACCESS_PROVIDERS`
 * (valori separati da virgole, case insensitive).
 *
 * - `google` → pulsante Google
 * - `ms` → pulsante Microsoft
 *
 * Se la variabile non è impostata o è vuota (solo spazi): default entrambi.
 */
export function getAccessProviders() {
  const raw = import.meta.env.VITE_ACCESS_PROVIDERS

  if (typeof raw !== 'string' || raw.trim() === '') {
    return { google: true, microsoft: true }
  }

  const tokens = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  )

  return {
    google: tokens.has('google'),
    microsoft: tokens.has('ms'),
  }
}
