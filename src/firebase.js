import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp,
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
})

/** Analytics requires a browser environment. */
export const analytics =
  typeof window !== 'undefined' ? getAnalytics(app) : null

const ACCOUNTS = 'accounts'
const EVENTS = 'events'
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

// ----- Events (lookup centralizzato) -----

/**
 * Risolve un event dalla stringa del QR/parametro route:
 * 1) documento `events/{param}` se esiste;
 * 2) primo doc con campo `id` uguale a `param`;
 * 3) primo doc con campo `name` uguale a `param`.
 * @param {string} param
 * @returns {Promise<object | null>} `{ id, ...data }` con `id` = id documento
 */
export async function findEventByQrcodeParam(param) {
  if (param == null || String(param).trim() === '') return null
  const trimmed = String(param).trim()

  const direct = await getDoc(doc(db, EVENTS, trimmed))
  if (direct.exists()) {
    return { ...direct.data(), id: direct.id }
  }

  const qByFieldId = query(
    collection(db, EVENTS),
    where('id', '==', trimmed),
    limit(1),
  )
  const snapId = await getDocs(qByFieldId)
  if (!snapId.empty) {
    const d = snapId.docs[0]
    return { ...d.data(), id: d.id }
  }

  const qByName = query(
    collection(db, EVENTS),
    where('name', '==', trimmed),
    limit(1),
  )
  const snapName = await getDocs(qByName)
  if (!snapName.empty) {
    const d = snapName.docs[0]
    return { ...d.data(), id: d.id }
  }

  return null
}

/**
 * @param {string} eventDocumentId
 * @returns {Promise<object | null>}
 */
export async function getEventByDocumentId(eventDocumentId) {
  if (!eventDocumentId) return null
  const snap = await getDoc(doc(db, EVENTS, eventDocumentId))
  if (!snap.exists()) return null
  return { ...snap.data(), id: snap.id }
}

// ----- Participations -----

/**
 * Partecipazione attiva: stesso uid ed event_id, senza `ended_at`.
 * @param {string} uid
 * @param {string} eventDocumentId id documento della collezione events
 * @returns {Promise<object | null>} `{ id, ...data }`
 */
export async function findActiveParticipationForUserEvent(uid, eventDocumentId) {
  if (!uid || !eventDocumentId) return null
  const qRef = query(
    collection(db, PARTICIPATIONS),
    where('uid', '==', uid),
    where('event_id', '==', eventDocumentId),
    limit(20),
  )
  const snap = await getDocs(qRef)
  for (const d of snap.docs) {
    const data = d.data()
    if (data.ended_at == null) {
      return { id: d.id, ...data }
    }
  }
  return null
}

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
 * @returns {Promise<{ id: string, uid: string, event_id: string, created_at?: unknown } | null>}
 */
export async function createParticipation(uid, eventDocumentId) {
  if (!uid || !eventDocumentId) return null
  const ref = await addDoc(collection(db, PARTICIPATIONS), {
    created_at: serverTimestamp(),
    uid,
    event_id: eventDocumentId,
  })
  const snap = await getDoc(ref)
  if (!snap.exists()) return { id: ref.id, uid, event_id: eventDocumentId }
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
