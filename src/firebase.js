import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  browserPopupRedirectResolver,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
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

/**
 * Su iPhone/iPad (anche Chrome “CriOS”, che usa WebKit) il popup OAuth spesso non aggiorna
 * correttamente la finestra dell’app → login completato ma UI ancora su `/login`.
 * Firebase consiglia il redirect flow su mobile.
 *
 * @see https://firebase.google.com/docs/auth/web/redirect-best-practices
 */
export function shouldUseOAuthRedirect() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    return true
  return false
}

/**
 * Consuma il redirect OAuth (Microsoft/Google). Su Safari/WebKit va usato lo stesso
 * `browserPopupRedirectResolver` passato a `signInWithRedirect`, altrimenti spesso si ottiene
 * `auth/no-auth-event` e l’utente resta su `/login`.
 */
export async function consumeAuthRedirectResult() {
  try {
    await getRedirectResult(auth, browserPopupRedirectResolver)
  } catch (err) {
    const code = err?.code ?? err?.name
    if (code === 'auth/no-auth-event') return
    console.warn('[auth] getRedirectResult', {
      code,
      message: err?.message,
      err,
    })
  }
}

/**
 * Dopo un redirect OAuth: consuma il risultato poi attendi l’init Auth (currentUser aggiornato).
 * Usare prima di guard router / mount dove si legge `auth.currentUser`.
 */
export async function ensureAuthReady() {
  await consumeAuthRedirectResult()
  await auth.authStateReady()
}

export async function signInWithGooglePreferred() {
  if (shouldUseOAuthRedirect()) {
    await signInWithRedirect(
      auth,
      googleProvider,
      browserPopupRedirectResolver,
    )
    return
  }
  await signInWithPopup(auth, googleProvider)
}

export async function signInWithMicrosoftPreferred() {
  if (shouldUseOAuthRedirect()) {
    await signInWithRedirect(
      auth,
      microsoftProvider,
      browserPopupRedirectResolver,
    )
    return
  }
  await signInWithPopup(auth, microsoftProvider)
}

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
