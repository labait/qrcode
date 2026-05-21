import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'
import { google } from 'googleapis'

const EVENTS = 'events'
const ACCOUNTS = 'accounts'
const PARTICIPATIONS = 'participations'

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

function loadServiceAccount() {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (inlineJson && inlineJson.trim()) {
    return JSON.parse(inlineJson)
  }

  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json')
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      'Service account non trovato. Configura GOOGLE_SERVICE_ACCOUNT_JSON oppure serviceAccountKey.json',
    )
  }

  return JSON.parse(fs.readFileSync(keyPath, 'utf8'))
}

function getAdminApp() {
  if (admin.apps.length > 0) return admin.app()
  const serviceAccount = loadServiceAccount()
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

function normalizeSheetTitle(raw) {
  const base = String(raw ?? '').trim() || 'export'
  // Google Sheets non accetta questi caratteri nei nomi foglio.
  const sanitized = base.replace(/[\\/?*\[\]:]/g, '_')
  return sanitized.slice(0, 100)
}

async function getEventByLookup(db, lookup) {
  const trimmed = String(lookup ?? '').trim()
  if (!trimmed) return null

  const direct = await db.collection(EVENTS).doc(trimmed).get()
  if (direct.exists) {
    return { id: direct.id, ...direct.data() }
  }

  const byId = await db
    .collection(EVENTS)
    .where('id', '==', trimmed)
    .limit(1)
    .get()
  if (!byId.empty) {
    const d = byId.docs[0]
    return { id: d.id, ...d.data() }
  }

  const byCode = await db
    .collection(EVENTS)
    .where('code', '==', trimmed)
    .limit(1)
    .get()
  if (!byCode.empty) {
    const d = byCode.docs[0]
    return { id: d.id, ...d.data() }
  }

  return null
}

async function assertAdmin(db, idToken) {
  if (!idToken) {
    throw new Error('Token mancante')
  }

  const decoded = await admin.auth().verifyIdToken(idToken)
  const accountSnap = await db.collection(ACCOUNTS).doc(decoded.uid).get()
  const account = accountSnap.exists ? accountSnap.data() : null
  const roles = Array.isArray(account?.roles) ? account.roles : []
  if (!roles.includes('admin')) {
    throw new Error('Permesso negato: admin richiesto')
  }
  return decoded.uid
}

async function getSheetsClient(serviceAccount) {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const app = getAdminApp()
    const db = admin.firestore(app)
    const serviceAccount = loadServiceAccount()

    const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
    const idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : ''

    await assertAdmin(db, idToken)

    const body = event.body ? JSON.parse(event.body) : {}
    const incomingEventId = String(body?.eventId ?? '').trim()
    const incomingSpreadsheetId = String(body?.spreadsheetId ?? '').trim()

    if (!incomingEventId) {
      return json(400, { error: 'eventId mancante' })
    }

    const ev = await getEventByLookup(db, incomingEventId)
    if (!ev?.id) {
      return json(404, { error: 'Evento non trovato' })
    }

    const spreadsheetId = incomingSpreadsheetId || String(ev.spreadsheet_id ?? '').trim()
    if (!spreadsheetId) {
      return json(400, { error: 'spreadsheetId mancante' })
    }

    const eventCode = String(ev.code ?? '').trim() || ev.id
    const eventTitle = String(ev.title ?? ev.name ?? '')
    const sheetTitle = normalizeSheetTitle(eventCode)

    const partSnap = await db
      .collection(PARTICIPATIONS)
      .where('event_id', '==', ev.id)
      .get()

    const rows = []
    for (const pDoc of partSnap.docs) {
      const p = pDoc.data()

      let firstname = String(p.firstname ?? '')
      let lastname = String(p.lastname ?? '')
      let email = String(p.email ?? '')

      if ((!firstname || !lastname || !email) && p.uid) {
        const aSnap = await db.collection(ACCOUNTS).doc(String(p.uid)).get()
        if (aSnap.exists) {
          const a = aSnap.data()
          if (!firstname) firstname = String(a.firstname ?? '')
          if (!lastname) lastname = String(a.lastname ?? '')
          if (!email) email = String(a.email ?? '')
        }
      }

      rows.push([
        pDoc.id,
        ev.id,
        eventCode,
        firstname,
        lastname,
        email,
      ])
    }

    const values = [
      ['participation.id', 'event.id', 'event.code', 'firstname', 'lastname', 'email'],
      ...rows,
    ]

    const sheets = await getSheetsClient(serviceAccount)

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetTitle },
            },
          },
        ],
      },
    }).catch(() => null)

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetTitle}!A:F`,
    })

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    })

    return json(200, {
      ok: true,
      eventId: ev.id,
      eventCode,
      eventTitle,
      sheetTitle,
      rowsWritten: rows.length,
      spreadsheetId,
    })
  } catch (err) {
    return json(500, {
      error: err?.message || 'Errore export',
    })
  }
}
