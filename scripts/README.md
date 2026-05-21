# Script di Aggiornamento Partecipazioni

## Descrizione

Lo script `update-participations.js` aggiorna retroattivamente tutte le partecipazioni nella collezione Firestore con i seguenti campi:

- **firstname** - Nome dell'utente (da `accounts/{uid}`)
- **lastname** - Cognome dell'utente (da `accounts/{uid}`)
- **email** - Email dell'utente (da `accounts/{uid}`)
- **event_code** - Codice evento (da `events/{eventId}`)
- **event_title** - Titolo evento (da `events/{eventId}`)

Lo script aggiorna solo i documenti che **non hanno già questi campi**, per non sovrascrivere dati esistenti.

## Setup

### 1. Installa le dipendenze

```bash
npm install firebase-admin
```

### 2. Scarica il file di credenziali (Service Account Key)

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto **floop-6b5b3**
3. Vai a **Impostazioni progetto** (ingranaggio in alto a sinistra)
4. Clicca sulla scheda **Account di servizio**
5. Clicca **Genera nuova chiave privata**
6. Salva il file JSON scaricato come **`serviceAccountKey.json`** nella **root del progetto** (accanto a `package.json`)

### ⚠️ IMPORTANTE: Proteggere il file

**NON committare mai `serviceAccountKey.json` in git!**

Aggiungi a `.gitignore`:
```
serviceAccountKey.json
```

## Esecuzione

### Modalità 1: Usando npm script

```bash
npm run update:participations
```

### Modalità 2: Direttamente con Node

```bash
node scripts/update-participations.js
```

## Output

Lo script stampa un report dettagliato:

```
⏳ Inizio aggiornamento retroattivo delle partecipazioni...

📋 Trovate 42 partecipazioni da elaborare

  Elaborando: 10/42
  Elaborando: 20/42
  Elaborando: 42/42

✅ Aggiornamento completato!

   📊 Partecipazioni elaborate: 42
   ✔️  Aggiornate: 35
   ⚠️  Con errori: 0
   ⏱️  Tempo impiegato: 3.45s
```

## Cosa fa lo script

1. **Legge tutte le partecipazioni** dalla collezione `participations`
2. **Per ogni partecipazione:**
   - Ottiene l'account dell'utente da `accounts/{uid}`
   - Ottiene l'evento da `events/{eventId}`
   - Estrae i dati necessari
   - Aggiorna il documento Firestore se ci sono campi mancanti
3. **Stampa un report** con il numero di aggiornamenti, errori e tempo impiegato

## Sicurezza

- Lo script usa **Firebase Admin SDK** con credenziali di service account
- Richiede accesso in lettura/scrittura alle collezioni `accounts`, `events` e `participations`
- Le credenziali nel file `serviceAccountKey.json` **non devono mai essere committate in git**

## Errori comuni

### "File serviceAccountKey.json non trovato"
- Assicurati di aver scaricato e salvato il file nella **root del progetto**
- Il file deve trovarsi allo stesso livello di `package.json`

### "Permission denied" durante l'aggiornamento
- Verifica che il service account abbia i permessi corretti su Firestore
- Controlla le regole Firestore in `firestore.rules`

### "Troppe richieste" (rate limiting)
- Se il numero di partecipazioni è molto elevato, Firestore potrebbe rate limitare
- Aspetta qualche minuto e riprova

## Integrazione Frontend

La funzione `retroactivelyUpdateParticipations()` è anche esportata da `src/firebase.js` e può essere usata da un componente admin nel frontend:

```javascript
import { retroactivelyUpdateParticipations } from '../firebase.js'

// In un componente admin
async function handleUpdate() {
  const result = await retroactivelyUpdateParticipations()
  console.log('Aggiornate:', result.updated)
  console.log('Errori:', result.errors)
}
```

Nota: L'utente deve essere autenticato come admin per usare questa funzione dal frontend.
