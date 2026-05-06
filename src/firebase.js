import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDYCWCBVVsp0zkRMqukAJI4pZXJElEn34Y',
  authDomain: 'vue-firebase-template-24856.firebaseapp.com',
  projectId: 'vue-firebase-template-24856',
  storageBucket: 'vue-firebase-template-24856.firebasestorage.app',
  messagingSenderId: '246919884058',
  appId: '1:246919884058:web:da4ee96ac1b1e35818d0a3',
  measurementId: 'G-W8TSYCGZZ5',
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
 * Crea `accounts/{uid}` se mancante, altrimenti allinea sempre name ed email al profilo Auth.
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

  try {
    // Allinea il token Auth a Firestore (evita permission-denied appena dopo il login)
    await user.getIdToken()

    const snap = await getDoc(ref)
    if (snap.exists()) {
      const prev = snap.data()
      const prevName = prev?.name ?? ''
      const prevEmail = prev?.email ?? ''
      if (prevName === name && prevEmail === email) {
        console.info(`${LOG} name/email already in sync`, { path })
        return true
      }
      await updateDoc(ref, { name, email })
      console.info(`${LOG} name/email updated`, {
        path,
        name,
        email,
      })
      return true
    }

    const accountData = {
      uid: user.uid,
      roles: [],
      name,
      email,
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
          ? 'Firestore rules: pubblica firestore.rules; create (uid, roles, name, email) o update name/email come proprietario.'
          : code === 'unavailable'
            ? 'Network / Firestore API. Check connection and that Firestore is enabled for the project.'
            : undefined,
      err,
    })
    return false
  }
}
