import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

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

/** Analytics requires a browser environment. */
export const analytics =
  typeof window !== 'undefined' ? getAnalytics(app) : null

const ACCOUNTS = 'accounts'

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
