import fs from 'node:fs'
import path from 'node:path'
import admin from 'firebase-admin'
import { GoogleAuth } from 'google-auth-library'

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

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

async function getSheetsAccessToken(serviceAccount) {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: [SHEETS_SCOPE],
  })
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Impossibile ottenere access token Google')
  return token
}

async function sheetsRequest(token, method, path, body) {
  const res = await fetch(`${SHEETS_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google Sheets API ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function writeSheetData(serviceAccount, spreadsheetId, sheetTitle, values) {
  const token = await getSheetsAccessToken(serviceAccount)

  let sheetGid = null
  const addResult = await sheetsRequest(token, 'POST', `/${spreadsheetId}:batchUpdate`, {
    requests: [{ addSheet: { properties: { title: sheetTitle } } }],
  }).catch(() => null)

  if (addResult?.replies?.[0]?.addSheet?.properties?.sheetId != null) {
    sheetGid = addResult.replies[0].addSheet.properties.sheetId
  } else {
    const meta = await sheetsRequest(
      token,
      'GET',
      `/${spreadsheetId}?fields=${encodeURIComponent('sheets.properties')}`,
    )
    const sheet = meta?.sheets?.find((s) => s.properties?.title === sheetTitle)
    sheetGid = sheet?.properties?.sheetId ?? null
  }

  const range = encodeURIComponent(`${sheetTitle}!A:F`)
  await sheetsRequest(token, 'POST', `/${spreadsheetId}/values/${range}:clear`, {})

  const updateRange = encodeURIComponent(`${sheetTitle}!A1`)
  await sheetsRequest(
    token,
    'PUT',
    `/${spreadsheetId}/values/${updateRange}?valueInputOption=RAW`,
    { values },
  )

  return sheetGid
}

function buildSpreadsheetUrl(spreadsheetId, sheetGid) {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  if (sheetGid != null) return `${base}#gid=${sheetGid}`
  return base
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

    const sheetGid = await writeSheetData(serviceAccount, spreadsheetId, sheetTitle, values)
    const spreadsheetUrl = buildSpreadsheetUrl(spreadsheetId, sheetGid)

    return json(200, {
      ok: true,
      eventId: ev.id,
      eventCode,
      eventTitle,
      sheetTitle,
      sheetGid,
      rowsWritten: rows.length,
      spreadsheetId,
      spreadsheetUrl,
    })
  } catch (err) {
    return json(500, {
      error: err?.message || 'Errore export',
    })
  }
}
