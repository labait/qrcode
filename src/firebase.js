import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAOr5pEB5kmEKXlRgKaPJuLJh_wx_mVLco",
  authDomain: "floop-6b5b3.firebaseapp.com",
  projectId: "floop-6b5b3",
  storageBucket: "floop-6b5b3.firebasestorage.app",
  messagingSenderId: "60356315860",
  appId: "1:60356315860:web:57c56495daf2a8ae178941",
  measurementId: "G-81PRZ0PZDD"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

/**
 * Tenant Azure AD (app single-tenant). Senza questo, MS usa `/common` e fallisce con
 * AADSTS50194 (“not configured as a multi-tenant application”).
 */
export const MICROSOFT_TENANT_ID = '2d7b4e34-4878-40c3-afd4-95963d5728fd'

/** Provider Microsoft (abilita "Microsoft" in Firebase Console → Authentication). */
export const microsoftProvider = new OAuthProvider('microsoft.com')
microsoftProvider.addScope('email')
microsoftProvider.addScope('openid')
microsoftProvider.addScope('profile')
microsoftProvider.setCustomParameters({
  tenant: MICROSOFT_TENANT_ID,
  prompt: 'select_account',
})

/** Analytics requires a browser environment. */
export const analytics =
  typeof window !== 'undefined' ? getAnalytics(app) : null

const ACCOUNTS = 'accounts'
const PARTICIPATIONS = 'participations'

const LOG = '[accounts]'

/**
 * Determina se l'account è amministratore (`roles` contiene `"admin"`).
 * Usa sempre questo helper dall'app — allineato a `isAdmin()` in `firestore.rules`.
 * @param {{ roles?: string[] } | null | undefined} account
 * @returns {boolean}
 */
export function isAdmin(account) {
  const roles = account?.roles
  return Array.isArray(roles) && roles.includes('admin')
}

/**
 * Indica se c'è un utente Firebase Auth nella sessione corrente.
 * Dopo navigazione/ricarico attendi prima `await auth.authStateReady()` perché `currentUser` può essere inizialmente null.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return auth.currentUser != null
}

/** @param {string | undefined} displayName */
function splitDisplayName(displayName) {
  const raw = (displayName ?? '').trim()
  if (!raw) {
    return { firstname: '', lastname: '' }
  }
  const spaceIndex = raw.indexOf(' ')
  if (spaceIndex === -1) {
    return { firstname: raw, lastname: '' }
  }
  return {
    firstname: raw.slice(0, spaceIndex),
    lastname: raw.slice(spaceIndex + 1).trim(),
  }
}

/**
 * Crea `accounts/{uid}` se mancante (nome/email da Auth + firstname/lastname).
 * Se il documento esiste già, non aggiorna nulla sul client: le regole Firestore
 * consentono al proprietario di modificare solo `firstname` e `lastname`.
 * @returns {Promise<boolean>} true se ok, false in caso di errore o utente assente
 */
export async function ensureUserAccount(user) {
  if (!user?.uid) {
    console.warn(`${LOG} ensureUserAccount skipped: missing user.uid`)
    return false
  }

  const path = `${ACCOUNTS}/${user.uid}`
  const ref = doc(db, ACCOUNTS, user.uid)
  const name = user.displayName ?? ''
  const email = user.email ?? ''
  const { firstname, lastname } = splitDisplayName(name ?? '')

  try {
    // Allinea il token Auth a Firestore (evita permission-denied appena dopo il login)
    await user.getIdToken()

    const snap = await getDoc(ref)
    if (snap.exists()) {
      console.info(`${LOG} account already exists, skip client-side sync`, { path })
      return true
    }

    const accountData = {
      uid: user.uid,
      roles: [],
      name,
      email,
      firstname,
      lastname,
    }
    await setDoc(ref, accountData)
    console.info(`${LOG} document created`, {
      path,
      data: accountData,
    })
    return true
  } catch (err) {
    const code = err?.code ?? err?.name
    const message = err?.message ?? String(err)
    console.error(`${LOG} ensureUserAccount failed`, {
      path,
      code,
      message,
      hint:
        code === 'permission-denied'
          ? 'Firestore rules: create con uid/roles/name/email/firstname/lastname; aggiorna solo firstname e lastname se non sei admin.'
          : code === 'unavailable'
            ? 'Network / Firestore API. Check connection and that Firestore is enabled for the project.'
            : undefined,
      err,
    })
    return false
  }
}

/**
 * Legge il documento Firestore `accounts/{uid}` (dopo login / ensureUserAccount).
 * @returns {Promise<object | null>} `{ id, ...fields }` o null se assente
 */
export async function getAccountByUid(uid) {
  if (!uid) return null
  const ref = doc(db, ACCOUNTS, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// ----- Participations -----

/**
 * @param {string} participationId
 * @returns {Promise<object | null>}
 */
export async function getParticipationById(participationId) {
  if (!participationId) return null
  const snap = await getDoc(doc(db, PARTICIPATIONS, participationId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * @param {string} uid
 * @param {string} eventDocumentId
 * @param {object} [event] Oggetto evento con id, code, title, ecc.
 * @returns {Promise<{ id: string, uid: string, event_id: string, firstname?: string, lastname?: string, email?: string, event_code?: string, event_title?: string, created_at?: unknown } | null>}
 */
export async function createParticipation(uid, eventDocumentId, event) {
  if (!uid || !eventDocumentId) return null

  const participationData = {
    created_at: serverTimestamp(),
    uid,
    event_id: eventDocumentId,
  }

  // Aggiungi dati dell'utente (firstname, lastname, email)
  try {
    const account = await getAccountByUid(uid)
    if (account) {
      if (account.firstname) participationData.firstname = account.firstname
      if (account.lastname) participationData.lastname = account.lastname
      if (account.email) participationData.email = account.email
    }
  } catch (err) {
    console.warn('[firebase] createParticipation: failed to get account', err)
  }

  // Aggiungi dati dell'evento (event_code, event_title)
  if (event) {
    if (event.code) participationData.event_code = event.code
    if (event.title) participationData.event_title = event.title
  }

  const ref = await addDoc(collection(db, PARTICIPATIONS), participationData)
  const snap = await getDoc(ref)
  if (!snap.exists()) return { id: ref.id, ...participationData }
  return { id: snap.id, ...snap.data() }
}

/**
 * Imposta `ended_at` al server timestamp.
 * @param {string} participationId
 */
export async function endParticipation(participationId) {
  if (!participationId) {
    throw new Error('endParticipation: participationId mancante')
  }
  const ref = doc(db, PARTICIPATIONS, participationId)
  await updateDoc(ref, { ended_at: serverTimestamp() })
}

/**
 * Aggiorna retroattivamente tutte le partecipazioni nella collezione con i dati dell'utente e dell'evento.
 * Questa funzione:
 * 1. Itera tutte le partecipazioni
 * 2. Per ogni partecipazione, ottiene l'account dell'utente e l'evento
 * 3. Aggiorna il documento con firstname, lastname, email (dall'utente) e event_code, event_title (dall'evento)
 * 
 * AVVERTENZA: operazione intensiva che richiede molte query Firestore.
 * Usa solo da admin/console per aggiornamenti una volta.
 * 
 * @returns {Promise<{ updated: number, errors: number, details: Array }>}
 */
export async function retroactivelyUpdateParticipations() {
  const stats = { updated: 0, errors: 0, details: [] }
  
  try {
    console.log('[firebase] Starting retroactive participation update...')
    
    // Itera tutte le partecipazioni
    const participationsSnap = await getDocs(collection(db, PARTICIPATIONS))
    const total = participationsSnap.size
    
    console.log(`[firebase] Found ${total} participations to process`)
    
    for (const partSnap of participationsSnap.docs) {
      const partId = partSnap.id
      const partData = partSnap.data()
      const uid = partData.uid
      const eventId = partData.event_id
      
      if (!uid || !eventId) {
        console.warn(`[firebase] Skipping participation ${partId}: missing uid or event_id`)
        stats.errors++
        stats.details.push({ id: partId, status: 'skipped', reason: 'missing uid or event_id' })
        continue
      }
      
      try {
        const updateData = {}
        let hasChanges = false
        
        // Ottieni account dell'utente
        try {
          const account = await getAccountByUid(uid)
          if (account) {
            if (account.firstname && !partData.firstname) {
              updateData.firstname = account.firstname
              hasChanges = true
            }
            if (account.lastname && !partData.lastname) {
              updateData.lastname = account.lastname
              hasChanges = true
            }
            if (account.email && !partData.email) {
              updateData.email = account.email
              hasChanges = true
            }
          }
        } catch (err) {
          console.warn(`[firebase] Failed to get account for uid ${uid}:`, err)
        }
        
        // Ottieni evento
        try {
          const eventSnap = await getDoc(doc(db, 'events', eventId))
          if (eventSnap.exists()) {
            const event = eventSnap.data()
            if (event.code && !partData.event_code) {
              updateData.event_code = event.code
              hasChanges = true
            }
            if (event.title && !partData.event_title) {
              updateData.event_title = event.title
              hasChanges = true
            }
          }
        } catch (err) {
          console.warn(`[firebase] Failed to get event ${eventId}:`, err)
        }
        
        // Aggiorna il documento se ci sono cambiamenti
        if (hasChanges) {
          const partRef = doc(db, PARTICIPATIONS, partId)
          await updateDoc(partRef, updateData)
          stats.updated++
          stats.details.push({ id: partId, status: 'updated', changes: Object.keys(updateData) })
          console.log(`[firebase] Updated participation ${partId} with:`, Object.keys(updateData))
        } else {
          stats.details.push({ id: partId, status: 'no_changes' })
        }
      } catch (err) {
        stats.errors++
        stats.details.push({ id: partId, status: 'error', error: err.message })
        console.error(`[firebase] Error updating participation ${partId}:`, err)
      }
    }
    
    console.log('[firebase] Retroactive update completed', stats)
    return stats
  } catch (err) {
    console.error('[firebase] retroactivelyUpdateParticipations failed:', err)
    throw err
  }
}
