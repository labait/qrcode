/**
 * Id istanza sanitizzato (default `laba`). Allineato al file `public/themes/[id].css`.
 */
export function getResolvedInstanceId() {
  const raw = import.meta.env.VITE_INSTANCE_ID
  let instanceId =
    typeof raw === 'string' && raw.trim() !== ''
      ? raw.trim()
      : 'laba'
  instanceId = instanceId.replace(/[^a-zA-Z0-9_-]/g, '') || 'laba'
  return instanceId
}

/**
 * Carica `public/themes/[VITE_INSTANCE_ID].css` (fallback: `laba`).
 * Ogni file tema deve contenere `body { display: block; }` perché nel bundle (`style.css`)
 * il body è `display: none` fino al caricamento del tema (evita FOUC).
 */
export function injectInstanceTheme() {
  if (typeof document === 'undefined') return

  const instanceId = getResolvedInstanceId()

  const href = `/themes/${encodeURIComponent(instanceId)}.css`

  const existing = document.querySelector(`link[data-instance-theme="${instanceId}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.instanceTheme = instanceId
  document.head.appendChild(link)
}
