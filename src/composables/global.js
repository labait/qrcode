import { reactive, inject } from 'vue'

export const globalInjectionKey = Symbol('global')

export function createGlobalState() {
  return reactive({
    loading: 0,
    dialog: null,
    account: null,
    /** Evento corrente (es. dopo join a una partecipazione). */
    event: null,
    /** Partecipazione corrente `{ id, ... }`. */
    participation: null,
  })
}

/**
 * Stato globale fornito da App.vue (provide).
 * @returns {ReturnType<typeof createGlobalState>}
 */
export function useGlobal() {
  const global = inject(globalInjectionKey)
  if (!global) {
    throw new Error('useGlobal() richiede provide(globalInjectionKey) in App.vue')
  }
  return global
}
