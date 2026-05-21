#!/usr/bin/env node

/**
 * Script per aggiornare retroattivamente tutte le partecipazioni con i dati dell'utente e dell'evento.
 * 
 * SETUP:
 * 1. Installa firebase-admin: npm install firebase-admin
 * 2. Scarica le credenziali del service account da Firebase Console:
 *    - Vai a: https://console.firebase.google.com/ > Impostazioni progetto > Account di servizio
 *    - Clicca "Genera nuova chiave privata"
 *    - Salva il file JSON (es. serviceAccountKey.json) nella cartella del progetto
 * 3. Esegui lo script: node scripts/update-participations.js
 * 
 * NOTA: Assicurati che il file serviceAccountKey.json NON sia committato in git (aggiungi a .gitignore)
 */

import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

// Carica il file di credenziali del service account
const serviceAccountPath = path.resolve('./serviceAccountKey.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    '\n❌ ERRORE: File serviceAccountKey.json non trovato!\n' +
    'Scaricalo da https://console.firebase.google.com/ > Impostazioni progetto > Account di servizio'
  )
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

// Inizializza Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

/**
 * Aggiorna retroattivamente tutte le partecipazioni
 */
async function updateParticipations() {
  const stats = { updated: 0, errors: 0, details: [] }
  const startTime = Date.now()

  try {
    console.log('⏳ Inizio aggiornamento retroattivo delle partecipazioni...\n')

    // Itera tutte le partecipazioni
    const participationsSnap = await db.collection('participations').get()
    const total = participationsSnap.size

    console.log(`📋 Trovate ${total} partecipazioni da elaborare\n`)

    let processed = 0

    for (const partSnap of participationsSnap.docs) {
      processed++
      const partId = partSnap.id
      const partData = partSnap.data()
      const uid = partData.uid
      const eventId = partData.event_id

      // Stampa progresso
      if (processed % 10 === 0 || processed === total) {
        console.log(`  Elaborando: ${processed}/${total}`)
      }

      if (!uid || !eventId) {
        console.warn(`  ⚠️  Saltata partecipazione ${partId}: uid o event_id mancanti`)
        stats.errors++
        stats.details.push({ id: partId, status: 'skipped', reason: 'missing uid or event_id' })
        continue
      }

      try {
        const updateData = {}
        let hasChanges = false

        // Ottieni account dell'utente
        try {
          const accountSnap = await db.collection('accounts').doc(uid).get()
          if (accountSnap.exists) {
            const account = accountSnap.data()
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
          console.error(`  ❌ Errore nel leggere account ${uid}:`, err.message)
        }

        // Ottieni evento
        try {
          const eventSnap = await db.collection('events').doc(eventId).get()
          if (eventSnap.exists) {
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
          console.error(`  ❌ Errore nel leggere evento ${eventId}:`, err.message)
        }

        // Aggiorna il documento se ci sono cambiamenti
        if (hasChanges) {
          await db.collection('participations').doc(partId).update(updateData)
          stats.updated++
          stats.details.push({ id: partId, status: 'updated', changes: Object.keys(updateData) })
        } else {
          stats.details.push({ id: partId, status: 'no_changes' })
        }
      } catch (err) {
        stats.errors++
        stats.details.push({ id: partId, status: 'error', error: err.message })
        console.error(`  ❌ Errore nell'aggiornare partecipazione ${partId}:`, err.message)
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n✅ Aggiornamento completato!\n')
    console.log(`   📊 Partecipazioni elaborate: ${total}`)
    console.log(`   ✔️  Aggiornate: ${stats.updated}`)
    console.log(`   ⚠️  Con errori: ${stats.errors}`)
    console.log(`   ⏱️  Tempo impiegato: ${duration}s\n`)

    return stats
  } catch (err) {
    console.error('❌ ERRORE CRITICO:', err.message)
    throw err
  }
}

// Esegui lo script
updateParticipations()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
