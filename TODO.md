# MorphCRM — TODO Architetturale

## Stato attuale: cosa c'è e cosa manca

### Cosa esiste ora (V0 — scaffolding)
- Frontend React con 4 pagine CRM mock (Dashboard, Contacts, Pipeline, Settings)
- Backend FastAPI con generazione codice via Claude API
- Il codice generato viene iniettato nel browser via Blob URL (fragile, non scalabile)
- "Sandbox" = solo syntax check con Node.js (non è una vera sandbox)
- Il codice generato finisce nel DB come stringa → non è codice reale, non è trovabile, non è testabile

### Cosa manca (problemi fondamentali)
**Il codice generato non esiste da nessuna parte.**
Non basta salvare una stringa nel DB. Una feature è codice reale: deve avere file reali, un path, una struttura, dei test. Devo poterla trovare, leggerla, modificarla, testarla.

**Non c'è una vera sandbox.**
Per sandbox si intende un ambiente isolato dove si fanno unit test della nuova feature E integration test con l'app esistente. Non un semplice syntax check.

**Non c'è modo di collegare la feature all'app.**
L'app principale ha API definite. Quando creo una nuova feature, come si collega? Come estende le API? Serve un pattern architetturale chiaro (gateway, plugin system, module federation, event bus).

---

## Decisioni architetturali da prendere

### 1. Dove vive il codice di una feature?
Ogni feature generata deve essere un modulo reale sul filesystem:

```
features/
├── weekly-goals-tracker/
│   ├── component.jsx          ← Il componente React
│   ├── api.py                 ← Endpoint backend (se la feature ne ha bisogno)
│   ├── tests/
│   │   ├── unit.test.js       ← Unit test del componente
│   │   └── integration.test.js ← Integration test con l'app
│   ├── metadata.json          ← Nome, icona, descrizione, prompt originale
│   └── manifest.json          ← Contratto: quali route espone, che dati usa, che API definisce
```

Il codice è reale, ha un path, è versionabile (git), è ispezionabile.

### 2. Come si collega la feature all'app? → API Gateway / Plugin System

L'app principale espone un **contratto** (Plugin Contract):

```
Plugin Contract:
- component: React component da renderizzare
- route: path nella sidebar (es. /feature/goals-tracker)
- sidebarEntry: { nome, icona, ordine }
- apiEndpoints: [opzionale] lista di API che la feature espone
- dataAccess: [opzionale] quali dati del CRM la feature può leggere
```

L'app ha un **Feature Gateway** che:
1. Scansiona la directory `features/`
2. Legge il `manifest.json` di ogni feature
3. Registra le route, i componenti, gli endpoint API
4. Il frontend li rende disponibili nella sidebar e nel router
5. Il backend monta gli endpoint API della feature sotto `/api/features/{feature-name}/...`

Questo è un **plugin system** — ogni feature è un plugin che si registra con l'app.

### 3. Cos'è la sandbox e come funziona?

La sandbox NON è solo "compila e vedi se funziona". È:

**Unit Test:**
- Il componente renderizza senza crash?
- Le props hanno i tipi giusti?
- I dati mock sono validi?
- Nessun pattern proibito (fetch, eval, localStorage)?

**Integration Test:**
- Il componente si monta nell'app senza rompere nulla?
- Le route non vanno in conflitto con route esistenti?
- Se la feature espone API, rispondono correttamente?
- Il design system è rispettato (colori, font, spacing)?

**Come funziona in pratica:**
1. L'AI genera il codice
2. Il codice viene scritto in una directory temporanea (`sandbox/{feature-id}/`)
3. Si eseguono gli unit test (Node.js + testing library minimale)
4. Si eseguono gli integration test (il componente viene montato in una copia dell'app)
5. Se tutto passa → il codice viene copiato in `features/{feature-name}/`
6. Se fallisce → l'AI riceve gli errori e corregge → loop auto-fix

### 4. Microservizi sì o no?

**Pro microservizi:**
- Massima modularità
- Ogni feature è completamente isolata
- Facile da scalare indipendentemente
- Crash di una feature non impatta le altre

**Contro microservizi (per un POC):**
- Overhead operazionale enorme (ogni feature = un processo/container)
- Complessità di rete (service discovery, load balancing)
- Tempi di generazione molto più lunghi
- L'utente deve aspettare che si avvii un intero servizio

**Decisione per il POC: Plugin System (no microservizi)**
Ogni feature è un modulo/plugin che vive nel processo principale, ma con isolamento logico. Se in futuro serve scalare, si può estrarre ogni plugin in un microservizio perché il contratto (manifest.json) è già definito.

---

## Piano di implementazione

### TASK 1: Ridefinire la struttura delle feature generate
- [x] Ogni feature = directory reale in `features/`
- [x] Definire lo schema di `manifest.json` (contratto plugin)
- [x] Il pipeline AI deve generare: component + manifest + test stubs
- [x] I file devono essere creati fisicamente e trovabili

### TASK 2: Implementare il Feature Gateway
- [x] Backend: scansiona `features/`, legge i manifest, registra route API dinamicamente
- [x] Frontend: scansiona i manifest, registra route nel router, aggiunge voci sidebar
- [x] Il gateway è il punto di collegamento tra feature e app

### TASK 3: Implementare la sandbox vera
- [x] Creare ambiente sandbox temporaneo (`sandbox/{id}/`)
- [x] Script di unit test: renderizza il componente, verifica export, verifica pattern
- [x] Script di integration test: monta nell'app, verifica route, verifica API
- [x] Se i test falliscono → auto-fix loop con Claude
- [x] Se passano → deploy nella directory `features/`

### TASK 4: Aggiornare il pipeline AI
- [x] Il prompt deve includere il contratto plugin (manifest.json)
- [x] L'AI genera: componente + manifest + test
- [x] Il pipeline: genera → sandbox test → auto-fix → deploy
- [x] Progress WebSocket aggiornato con step reali (non finti sleep)

### TASK 5: UI/UX Agent
- [x] Endpoint che analizza tutte le feature installate
- [x] Valuta: ridondanza, coerenza visiva, organizzazione sidebar
- [x] Ritorna score, problemi, suggerimenti
- [x] UI nella pagina Settings

### TASK 6: Pulizia
- [x] Rimuovere il caricamento Blob URL (sostituire con import reale dal gateway)
- [x] Rimuovere il codice dal DB (il codice sta nei file, il DB tiene solo metadata)
- [x] Aggiornare la documentazione

---

## Note
- Per il POC, le feature NON hanno backend API proprio (solo componente React). Le API sono un'evoluzione futura.
- Il focus è dimostrare: prompt → genera codice reale → testa → installa → funziona nell'app.
- Il codice generato deve essere ispezionabile, modificabile, e persistente.


----

# MorphCRM — Architettura Moduli Dinamici

## Il Problema Centrale

L'AI genera una stringa di codice React. Quella stringa deve diventare una pagina funzionante dentro l'app in produzione, indistinguibile dalle pagine base. Tutto questo senza intervento umano.

La pipeline ha 6 nodi, ognuno con decisioni precise da prendere.

```
PROMPT UTENTE
     │
     ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  1. AI   │───▶│ 2. FILE  │───▶│ 3. BUILD │───▶│ 4. TEST  │───▶│ 5. STORE │───▶│ 6. LOAD  │
│ GENERA   │    │ SYSTEM   │    │          │    │ SANDBOX  │    │          │    │ RUNTIME  │
│ CODICE   │    │          │    │          │    │          │    │          │    │          │
│          │    │ Dove va   │    │ Come     │    │ Come     │    │ Dove     │    │ Come lo  │
│ Stringa  │    │ il file?  │    │ diventa  │    │ verifico │    │ salvo il │    │ carico   │
│ di code  │    │          │    │ un bundle│    │ che      │    │ bundle   │    │ nell'app │
│          │    │          │    │ JS?      │    │ funziona?│    │ finale?  │    │ live?    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                     │
                                                     │ se errore
                                                     ▼
                                                ┌──────────┐
                                                │ AUTO-FIX │
                                                │ LOOP     │──── torna a 1.
                                                └──────────┘
```

---

## Nodo 1 — AI Genera Codice

### Input
Il prompt dell'utente + il meta-prompt iniettato dal sistema (contesto CRM, design system, vincoli tecnici).

### Output
L'AI restituisce un JSON strutturato, non solo codice libero:

```json
{
  "nome": "Report Vendite Settimanale",
  "icona": "📈",
  "descrizione": "Report con grafici delle vendite per settimana",
  "componente": "import { useState } from 'react';\nimport { BarChart, Bar, XAxis, YAxis } from 'recharts';\n\nexport default function ReportVendite() {\n  // ... componente completo\n}",
  "dipendenze": ["recharts"]
}
```

### Vincoli imposti all'AI
Il meta-prompt forza l'AI a rispettare regole rigide. Queste regole sono la base su cui si regge tutta la pipeline:

**Regola 1 — Un file, un componente.** Ogni feature è UN singolo file con UN export default. Niente multi-file, niente import relativi.

**Regola 2 — Whitelist dipendenze.** Il componente può importare SOLO da una lista approvata:
- `react` (hooks)
- `recharts` (grafici)
- `date-fns` (date)
- `lucide-react` (icone)
- Un modulo interno `@morphcrm/shared` che espone:
  - Design tokens (colori, spacing)
  - Componenti UI base (Button, Card, Table, Modal, Input)
  - Dati mock del CRM (contacts, deals, activities) — *solo lettura*

**Regola 3 — Niente side effects globali.** No localStorage, no fetch verso URL esterni, no window.*, no document.* diretto.

**Regola 4 — Self-contained data.** Se la feature ha bisogno di dati propri (es. un tracker), li genera come stato interno con useState. Se ha bisogno di dati CRM, li importa da `@morphcrm/shared`.

---

## Nodo 2 — File System

### Dove finisce il codice generato?

Il backend scrive il codice in una directory dedicata nel filesystem del server:

```
/server
  /features
    /feat_abc123
      component.jsx        ← codice generato dall'AI
      metadata.json         ← nome, icona, descrizione, dipendenze
      bundle.js             ← output del build (dopo nodo 3)
      status.json           ← stato pipeline: generating|building|testing|ready|failed
```

Ogni feature ha una sua cartella, identificata da un ID univoco. Questo permette di gestire generazione, build, test e rollback in modo indipendente per ogni feature.

### Perché filesystem e non solo database?
Perché il bundler (nodo 3) lavora su file reali. Il codice deve esistere su disco per essere compilato. Il database (Feature Registry) mantiene i metadati e lo stato, il filesystem ospita il codice e il bundle.

---

## Nodo 3 — Build

### Il problema
`component.jsx` è JSX + import moderni. Il browser non lo capisce così com'è. Serve un passaggio: **transpile + bundle**.

### La scelta: esbuild

esbuild è perfetto per questo caso d'uso perché è velocissimo (millisecondi, non secondi), supporta JSX e ES modules, e può produrre un singolo file bundle.

### Come funziona il build

```
Input:   /features/feat_abc123/component.jsx
Comando: esbuild component.jsx --bundle --format=esm --outfile=bundle.js
Output:  /features/feat_abc123/bundle.js
```

### Il problema degli import: resolve aliases

Il componente generato dall'AI scrive cose come:
```js
import { useState } from 'react';
import { BarChart } from 'recharts';
import { Card, Table } from '@morphcrm/shared';
```

Questi import NON devono essere inclusi nel bundle — React, Recharts ecc. esistono già nell'app host. Il bundle della feature deve trattarli come **externals**.

La configurazione esbuild:

```
esbuild.build({
  entryPoints: ['component.jsx'],
  bundle: true,
  format: 'esm',
  outfile: 'bundle.js',
  external: [
    'react',
    'recharts',
    'date-fns',
    'lucide-react',
    '@morphcrm/shared'
  ],
  jsx: 'automatic'
})
```

Il bundle finale sarà un file JS che:
- Contiene SOLO il codice della feature
- Importa le dipendenze come external (le risolve a runtime)
- Esporta un componente React di default

---

## Nodo 4 — Sandbox Test (Automatico)

### Cosa verifica e in che ordine

```
TEST LAYER 1 — Build statico (già coperto dal nodo 3)
├── Il codice compila senza errori?
├── Tutti gli import sono nella whitelist?
└── Nessun pattern vietato? (fetch, localStorage, eval, etc.)

TEST LAYER 2 — Render check
├── Il componente si monta senza crash?
├── Nessun errore React nel console?
└── Produce output DOM non-vuoto?

TEST LAYER 3 — Smoke test (opzionale per POC avanzato)
├── Se ci sono bottoni, sono cliccabili senza crash?
├── Se ci sono input, accettano testo senza crash?
└── Il componente sopravvive 5 secondi senza errori?
```

### Come eseguire il Layer 2: Node.js + jsdom

Non serve un browser reale. Il backend può verificare il rendering con un micro-script Node.js:

```
Processo:
1. Crea un ambiente jsdom (DOM simulato)
2. Importa React + ReactDOM (server-side)
3. Monta il componente in una div
4. Verifica: ha prodotto HTML? ci sono errori?
5. Output: PASS / FAIL + eventuali messaggi di errore
```

Questo gira in 1-2 secondi ed è sufficiente per il POC. Non verifica il visual (potrebbe essere brutto) ma verifica che non crashi.

### Alternativa più robusta: Playwright headless
Per un layer più completo, si può usare Playwright per aprire il componente in un browser headless reale, verificare il rendering visivo, e fare screenshot. Pesante per il POC, ma un upgrade naturale per la V2.

---

## Nodo 4b — Auto-Fix Loop

### Trigger
Il test del nodo 4 fallisce — potrebbe essere un errore di compilazione (nodo 3) o un errore di rendering (nodo 4).

### Come funziona

```
tentativo = 1
max_tentativi = 5

LOOP:
  se tentativo > max_tentativi:
      → stato = "failed"
      → notifica frontend: "Non riesco a creare questa feature"
      → STOP

  se errore_compilazione:
      → manda all'AI: codice + messaggio di errore di esbuild
      → prompt: "Il codice ha questo errore di compilazione: {errore}. 
                 Correggi e restituisci il componente completo."

  se errore_rendering:
      → manda all'AI: codice + stack trace dell'errore React
      → prompt: "Il componente crasha al rendering con: {errore}. 
                 Correggi e restituisci il componente completo."

  → Ricevi codice corretto
  → Sovrascrivi component.jsx
  → Torna al nodo 3 (rebuild)
  → tentativo += 1
```

### Stato comunicato al frontend via WebSocket
Ad ogni passaggio del loop, il frontend riceve un update:
- `{ stato: "fixing", tentativo: 2, messaggio: "Trovato un errore, sto correggendo..." }`
- `{ stato: "rebuilding", tentativo: 2 }`
- `{ stato: "retesting", tentativo: 2 }`

---

## Nodo 5 — Store

### Quando il test passa, cosa succede al bundle?

**Per il POC (semplice):**
Il bundle resta nel filesystem del server. Il frontend lo scarica via un endpoint API:
```
GET /api/features/{feature_id}/bundle.js
→ restituisce il file JS statico
```

**Per la produzione (evoluzione):**
Il bundle viene caricato su un object storage (S3, Cloudflare R2) e servito via CDN. Questo scala meglio e separa il file serving dal backend API.

### Cosa viene salvato nel database (Feature Registry)

```
Feature {
  id:             "feat_abc123"
  nome:           "Report Vendite Settimanale"
  icona:          "📈"
  descrizione:    "Report con grafici delle vendite..."
  prompt_utente:  "Crea un report settimanale delle vendite"
  bundle_path:    "/features/feat_abc123/bundle.js"  (o URL CDN)
  stato:          "ready"
  tentativi:      1
  creato_il:      "2026-02-16T14:30:00Z"
  ordine_sidebar: 5
}
```

Il codice sorgente (component.jsx) viene conservato per debugging e per permettere future rigenerazioni, ma non viene mai esposto al frontend.

---

## Nodo 6 — Runtime Loading (Il Pezzo Più Critico)

### Il problema
L'app React è già in esecuzione nel browser. Devo caricare un nuovo componente React (il bundle della feature) senza ricaricare la pagina, e devo risolvere le sue dipendenze (React, Recharts, ecc.) con quelle già presenti nell'app.

### La soluzione: Import Map + Dynamic Import

#### Passo 1 — Import Map globale
All'avvio, l'app host dichiara una import map che mappa i nomi dei moduli ai moduli reali:

```js
// Nel runtime dell'app host, creiamo un registry globale
window.__MORPH_MODULES__ = {
  'react': React,
  'react/jsx-runtime': ReactJSXRuntime,
  'recharts': Recharts,
  'date-fns': DateFns,
  'lucide-react': LucideReact,
  '@morphcrm/shared': MorphShared   // componenti UI + dati mock
};
```

#### Passo 2 — Fetch + Transform del bundle
Quando l'utente naviga a una feature AI, il frontend:

```
1. Fetch il bundle:
   const response = await fetch(`/api/features/${id}/bundle.js`)
   const codice = await response.text()

2. Trasforma gli import esterni in lookup dalla import map:
   Gli import tipo `import { useState } from 'react'` nel bundle ESM
   vengono risolti tramite un wrapper che li mappa a window.__MORPH_MODULES__

3. Crea un Blob URL:
   const blob = new Blob([codiceTrasformato], { type: 'application/javascript' })
   const url = URL.createObjectURL(blob)

4. Dynamic import:
   const modulo = await import(url)
   const Componente = modulo.default

5. Renderizza:
   <FeatureContainer>
     <Componente />
   </FeatureContainer>
```

#### Passo 3 — FeatureContainer (Error Boundary)
Ogni feature viene renderizzata dentro un Error Boundary dedicato. Se la feature crasha a runtime (anche dopo i test), l'app non crasha — l'utente vede un messaggio tipo: "Questa feature ha un problema. Vuoi rigenerarla?"

```
<Route path="/feature/:id" element={
  <FeatureErrorBoundary featureId={id}>
    <Suspense fallback={<LoadingSpinner />}>
      <DynamicFeature id={id} />
    </Suspense>
  </FeatureErrorBoundary>
} />
```

---

## Schema Pipeline Completo — Vista Unificata

```
UTENTE: "Crea un report settimanale vendite"
  │
  ▼
FRONTEND: Apre modal → invia prompt al backend via POST /api/features/create
  │
  ▼
BACKEND (FastAPI):
  │
  ├─ 1. GENERA ──────────────────────────────────────────────────
  │   Costruisce meta-prompt (contesto CRM + vincoli + design system)
  │   Chiama Claude API → riceve JSON con codice + metadati
  │   WebSocket → frontend: { stato: "generating" }
  │
  ├─ 2. SCRIVI ──────────────────────────────────────────────────
  │   Crea /features/feat_abc123/
  │   Scrive component.jsx + metadata.json
  │
  ├─ 3. BUILD ───────────────────────────────────────────────────
  │   esbuild transpile + bundle → bundle.js
  │   WebSocket → frontend: { stato: "building" }
  │   Se errore → vai ad AUTO-FIX
  │
  ├─ 4. TEST ────────────────────────────────────────────────────
  │   Node.js + jsdom → monta componente → verifica render
  │   WebSocket → frontend: { stato: "testing" }
  │   Se errore → vai ad AUTO-FIX
  │
  │   ┌─ AUTO-FIX (max 5 tentativi) ─────────────────────────
  │   │  Invia errore + codice all'AI
  │   │  Ricevi codice corretto
  │   │  Sovrascrivi component.jsx
  │   │  WebSocket → frontend: { stato: "fixing", tentativo: N }
  │   │  Torna a BUILD
  │   └───────────────────────────────────────────────────────
  │
  ├─ 5. STORE ───────────────────────────────────────────────────
  │   Salva metadati nel DB (Feature Registry)
  │   bundle.js è già su disco, pronto per servire
  │   WebSocket → frontend: { stato: "ready", nome, icona, id }
  │
  ▼
FRONTEND:
  │
  ├─ 6. INTEGRA ─────────────────────────────────────────────────
  │   Riceve "ready" via WebSocket
  │   Aggiunge voce in sidebar
  │   Chiude modal con animazione successo
  │   Naviga alla nuova feature
  │   Fetch bundle.js → Blob URL → dynamic import → render
  │
  ▼
UTENTE: Vede la nuova pagina, funzionante, nella sidebar del CRM.
```

---

## Rischio Principale & Mitigazione

**Il rischio #1** è la risoluzione degli import a runtime (Nodo 6, Passo 2). Trasformare un bundle ESM per risolvere import da una mappa globale è il punto dove più cose possono andare storte.

**Alternativa più sicura (se il Blob URL approach dà problemi):**
Invece di bundle ESM con import esterni, si può fare il build con tutte le dipendenze inline (no externals). Il bundle sarà più pesante (include React, Recharts ecc.) ma non ci sono problemi di risoluzione. Per un POC con poche feature, il peso extra è trascurabile.

**Questa è una decisione da prendere durante lo sviluppo, non prima.** Meglio partire con l'approccio external (più pulito), e fallback sull'approccio inline se emergono problemi.