# MorphCRM — Specifiche Progetto v1.0

## 1. Vision & Tesi

**Tesi da dimostrare:** Il modello SaaS tradizionale (feature roadmap dettata dal vendor, piani pricing a tier, utente passivo) è obsoleto. Con l'AI, l'utente finale può costruirsi le feature che gli servono, quando gli servono, senza scrivere una riga di codice.

**Il prodotto:** Un CRM funzionante con pagine base pre-costruite. L'utente trova un bottone "Costruisci Feature" — lo clicca, descrive in linguaggio naturale cosa vuole, e l'AI genera la feature, la testa in autonomia, e la installa nell'app. Nessun codice visibile, nessun passaggio tecnico. L'app si evolve in base all'utente.

**Perché un CRM:** Il CRM è il simbolo del SaaS tradizionale (Salesforce, HubSpot, Pipedrive). Dimostrare la tesi su un CRM è il "mic drop" perfetto. Se funziona su un CRM, funziona ovunque.

**Formato:** Proof of Concept / demo interattiva.

---

## 2. Architettura ad Alto Livello

```
┌─────────────────────────────────────────────┐
│              FRONTEND (React)               │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ CRM Base │ │ Feature  │ │  Dynamic   │  │
│  │  Pages   │ │ Builder  │ │  Feature   │  │
│  │ (mock)   │ │   UI     │ │  Renderer  │  │
│  └──────────┘ └──────────┘ └────────────┘  │
│                     │                       │
└─────────────────────│───────────────────────┘
                      │ WebSocket (progress updates)
                      │ REST API
┌─────────────────────│───────────────────────┐
│             BACKEND (Python/FastAPI)         │
│                     │                       │
│  ┌──────────────────▼──────────────────┐    │
│  │          AI PIPELINE                │    │
│  │                                     │    │
│  │  1. Prompt Engineering Layer        │    │
│  │  2. Code Generation (LLM)          │    │
│  │  3. Sandbox Testing (automatico)   │    │
│  │  4. Auto-Fix Loop                  │    │
│  │  5. Deploy / Integrazione          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌──────────────┐  ┌───────────────────┐    │
│  │  Feature     │  │    Sandbox        │    │
│  │  Registry    │  │    Environment    │    │
│  │  (DB)        │  │    (isolato)      │    │
│  └──────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 3. Pagine CRM Base (Mock)

Tutte le pagine usano dati finti (hardcoded o seed data). Lo scopo è dare contesto realistico, non funzionalità reale.

### 3.1 Dashboard
- Metriche in card: Leads totali, Deals in pipeline, Revenue stimata, Conversion rate
- Grafici finti: andamento leads ultimi 6 mesi (bar chart), pipeline per stage (donut)
- Activity feed recente (ultime 5 attività mock)

### 3.2 Contatti / Leads
- Tabella con colonne: Nome, Email, Azienda, Stato (New / Contacted / Qualified / Lost), Data creazione
- 15-20 contatti mock con dati realistici
- Barra di ricerca (funzionante sul mock data)
- Filtro per stato
- Click su un contatto → dettaglio (sidebar o pagina)

### 3.3 Pipeline / Deals
- Vista Kanban con colonne: Prospect → Qualificato → Proposta → Negoziazione → Chiuso Vinto / Perso
- 8-12 deal mock con nome deal, valore €, contatto associato, data
- Drag & drop tra colonne (funzionante sul mock data)

### 3.4 Impostazioni / Profilo
- Avatar + nome utente mock
- Form finto con campi: nome azienda, email, timezone, lingua
- Sezione "Feature installate" (lista delle feature create con AI — inizialmente vuota)

---

## 4. Sidebar / Navigazione

### Layout
```
┌─────────────────────┐
│  🟣 MorphCRM        │  ← Logo/nome
│                     │
│  📊 Dashboard       │
│  👥 Contatti        │
│  🔀 Pipeline        │
│  ⚙️ Impostazioni    │
│                     │
│  ── Feature AI ──   │  ← Separatore (appare dopo prima feature)
│  📈 [Feature 1]    │  ← Generate dall'AI
│  📋 [Feature 2]    │  ← Generate dall'AI
│                     │
│                     │
│                     │
│  ┌─────────────────┐│
│  │ 🤖 Costruisci   ││  ← Bottone principale, sempre visibile
│  │    Feature      ││     in basso nella sidebar
│  └─────────────────┘│
└─────────────────────┘
```

### Comportamento
- Le 4 pagine base sono sempre presenti e non rimovibili
- Ogni feature AI aggiunta crea una nuova voce sotto il separatore "Feature AI"
- Il bottone "Costruisci Feature" è fisso in basso nella sidebar, sempre accessibile
- Ogni voce feature AI ha un'icona scelta dall'AI in base al contesto (emoji)

---

## 5. Flusso "Costruisci Feature" — Step by Step

### Step 1 — Attivazione
- L'utente clicca "🤖 Costruisci Feature" nella sidebar
- Si apre un **modal centrato** con un campo di testo grande e placeholder: *"Descrivi la feature che vuoi creare..."*
- Sotto il campo: suggerimenti cliccabili con esempi (per guidare utenti non-tecnici):
  - "Crea un report settimanale delle vendite"
  - "Aggiungi un calendario per i follow-up"
  - "Crea un tracker degli obiettivi mensili"
  - "Aggiungi email templates per i lead"

### Step 2 — Invio Prompt
- L'utente scrive o clicca un suggerimento e preme "Crea" (o Enter)
- Il modal si trasforma nella **vista di progresso**

### Step 3 — Progress View (cosa vede l'utente)
Il modal resta aperto e mostra una sequenza di stati con animazione:

```
Stato 1: 🔍 "Sto analizzando la tua richiesta..."          (2-3 sec)
Stato 2: 🧠 "Progettando l'architettura della feature..."  (3-5 sec)
Stato 3: ⚙️ "Generando il codice..."                       (5-10 sec)
Stato 4: 🧪 "Testing in corso..."                          (3-5 sec)
Stato 5: ✅ "Feature pronta! Installazione..."             (1-2 sec)
```

**Se entra in auto-fix loop:**
```
Stato 4: 🧪 "Testing in corso..."
Stato 4b: 🔧 "Trovato un problema, sto correggendo..."    (può ripetersi)
Stato 4: 🧪 "Ri-testing..."
Stato 5: ✅ "Feature pronta! Installazione..."
```

- Ogni stato ha una progress bar animata
- I tempi sono indicativi — dipendono dalla complessità e dal modello LLM
- Animazione fluida, transizioni smooth tra stati

### Step 4 — Installazione Automatica
- Nessuna conferma richiesta
- Il modal si chiude con un'animazione di successo (es. checkmark animato)
- La nuova voce appare nella sidebar con un'animazione highlight (glow o pulse)
- L'app naviga automaticamente alla nuova feature

### Step 5 — Feature Live
- La feature è operativa e navigabile come qualsiasi pagina del CRM
- Usa lo stesso design system delle pagine base (consistenza visiva)

---

## 6. AI Pipeline — Backend (Dietro le Quinte)

### 6.1 Prompt Engineering Layer
Quando il backend riceve il prompt dell'utente, lo arricchisce con contesto:

```
CONTESTO INIETTATO AUTOMATICAMENTE:
- "Sei dentro un CRM chiamato MorphCRM"
- "Le pagine esistenti sono: Dashboard, Contatti, Pipeline, Impostazioni"
- "Le feature AI già installate sono: [lista]"
- "Il design system usa: [specifiche colori, font, componenti]"
- "La feature deve essere un componente React autonomo"
- "Deve usare solo questi import: [lista librerie disponibili]"
- "I dati mock devono essere realistici e coerenti col CRM"
```

Il prompt dell'utente viene incapsulato in un meta-prompt che guida l'LLM a generare:
1. Il codice React del componente
2. Un nome e icona per la sidebar
3. Una breve descrizione della feature
4. Eventuali dati mock necessari

### 6.2 Code Generation
- Modello: Claude Sonnet (via API Anthropic) — ottimo rapporto qualità/velocità per generazione codice
- Output atteso: un componente React funzionante + metadati (nome, icona, descrizione)
- Il componente deve essere self-contained (nessuna dipendenza esterna non prevista)

### 6.3 Sandbox Testing (Automatico)
Il backend prende il codice generato e lo esegue in un ambiente isolato:

**Opzione A — Approccio leggero (consigliato per POC):**
- Il backend compila il componente React in un ambiente Node temporaneo
- Verifica: il codice compila senza errori? Il componente renderizza senza crash?
- Check statico: lint basico, import validi, nessuna chiamata API esterna non autorizzata

**Opzione B — Approccio robusto (evoluzione futura):**
- Container Docker effimero con un'istanza dell'app
- Il componente viene montato nell'app reale
- Headless browser (Playwright) verifica il rendering visivo
- Screenshot automatico per validazione

### 6.4 Auto-Fix Loop
```
max_tentativi = 5

per ogni tentativo:
    1. Compila il codice
    2. Se errore di compilazione:
       → Invia errore + codice all'LLM
       → "Correggi questo errore: {errore}"
       → Ricevi codice corretto
       → Torna al punto 1
    3. Se compila OK → Renderizza
    4. Se errore di runtime:
       → Invia errore + codice all'LLM
       → Ricevi codice corretto
       → Torna al punto 1
    5. Se tutto OK → Passa al deploy

se max_tentativi raggiunto:
    → Notifica frontend: "Non sono riuscito a creare questa feature.
       Prova a riformulare la richiesta."
```

### 6.5 Deploy / Integrazione
Una volta che il codice passa i test:
1. Il componente viene salvato nel **Feature Registry** (database)
2. Il frontend riceve via WebSocket: `{ tipo: "feature_ready", nome, icona, id }`
3. Il frontend aggiunge la voce nella sidebar
4. Il componente viene caricato dinamicamente (React lazy loading)

---

## 7. Feature Registry — Modello Dati

```
Feature {
  id:           UUID
  nome:         string        // "Report Vendite Settimanale"
  icona:        string        // "📈"
  descrizione:  string        // "Report automatico con grafici..."
  prompt_utente: string       // Il prompt originale dell'utente
  codice:       text          // Codice React del componente
  stato:        enum          // "generating" | "testing" | "fixing" | "ready" | "failed"
  tentativi:    int           // Numero di tentativi auto-fix
  creato_il:    timestamp
  ordine_sidebar: int         // Posizione nella sidebar
}
```

---

## 8. Tech Stack Dettagliato

### Frontend
| Cosa | Scelta | Perché |
|------|--------|--------|
| Framework | React 18+ (Vite) | Leggero, fast refresh, no overhead SSR (non serve per POC) |
| Styling | Tailwind CSS | Rapidità di sviluppo, facile da replicare nel codice AI-generated |
| State | Zustand | Minimale, perfetto per gestire sidebar dinamica + stato feature |
| Routing | React Router | Standard, semplice |
| Comunicazione real-time | WebSocket (nativo o socket.io-client) | Per progress updates durante la generazione |
| Dynamic component loading | React.lazy + import dinamico | Per caricare le feature AI a runtime |
| Grafici (dashboard mock) | Recharts | Leggero, React-native |
| Drag & drop (pipeline) | dnd-kit | Moderno, performante |

### Backend
| Cosa | Scelta | Perché |
|------|--------|--------|
| Framework | FastAPI (Python) | Async nativo, WebSocket integrato, perfetto per I/O LLM |
| LLM | Anthropic Claude API (Sonnet) | Eccellente code generation, fast |
| Sandbox | Subprocess + Node.js temporaneo | Leggero per POC — compila e verifica il componente React |
| Database | SQLite (o PostgreSQL se hosted) | Feature registry — minimal per POC |
| WebSocket | FastAPI WebSocket | Progress updates in tempo reale |
| Task queue (opzionale) | Nessuno per POC (async FastAPI basta) | Celery/Redis se si scala |

### Infra (POC)
| Cosa | Scelta |
|------|--------|
| Frontend hosting | Vercel o Netlify |
| Backend hosting | Railway, Render, o Fly.io |
| Database | SQLite locale (POC) o Supabase (se serve persistenza) |

---

## 9. Dynamic Component Loading — Come Funziona

Questo è il cuore tecnico del progetto. Come fa una feature generata dall'AI a "vivere" dentro l'app?

### Approccio: Blob URL + Dynamic Import
1. Il codice React generato viene salvato come stringa nel database
2. Quando l'utente naviga alla feature, il frontend:
   - Recupera il codice dal backend via API
   - Crea un Blob URL con il codice transpilato
   - Lo carica come modulo dinamico
   - Lo renderizza in un container dedicato

### Vincoli per il codice generato
Per garantire che le feature AI siano compatibili, il codice generato deve rispettare:
- Solo React hooks (useState, useEffect, ecc.)
- Solo librerie pre-approvate (Recharts, date-fns, ecc.)
- Styling solo con Tailwind classes (stesse dell'app base)
- Nessuna chiamata API esterna
- Nessun accesso a localStorage/sessionStorage
- Export default di un componente funzionale
- Dati mock interni al componente

---

## 10. Design System — Vincoli Visivi

Per garantire coerenza tra pagine base e feature AI-generated:

```
Palette:
- Background:     #0f0f17 (dark)
- Surface:        #1a1a2e
- Surface hover:  #252540
- Primary:        #6366f1 (indigo)
- Success:        #10b981
- Warning:        #f59e0b
- Error:          #ef4444
- Text primary:   #ffffff
- Text secondary: #94a3b8

Font: Inter (sans-serif)
Border radius: 8px (card), 6px (button), 4px (input)
Spacing unit: 4px (base)
```

Queste specifiche vengono iniettate nel prompt dell'AI per garantire che ogni feature generata sia visivamente coerente.

---

## 11. Scope POC — Cosa È Dentro e Cosa È Fuori

### ✅ IN SCOPE
- 4 pagine CRM mock complete con dati finti
- Sidebar dinamica con navigazione
- Bottone "Costruisci Feature" con modal
- AI pipeline completa: prompt → genera → testa → fix → deploy
- Progress bar animata durante la generazione
- 3-5 feature demo pre-testate da mostrare (es. "Report vendite", "Calendario follow-up", "Tracker obiettivi")
- Feature che si aggiungono alla sidebar automaticamente
- Design system dark mode coerente

### ❌ FUORI SCOPE (per ora)
- Autenticazione / multi-utente
- Dati reali / database persistente per il CRM
- Modifica/eliminazione di feature installate
- Feature che interagiscono tra loro (es. la feature "Report" che legge dati dalla pagina "Pipeline")
- Versioning delle feature
- Rollback
- Mobile responsive (nice to have ma non prioritario)
- Test end-to-end automatizzati
- Rate limiting / costi API

---

## 12. Rischi & Domande Aperte

### Rischi Tecnici
1. **Dynamic component loading**: Il caricamento di codice generato a runtime è la parte più delicata. L'approccio Blob URL funziona ma ha limitazioni di sicurezza. Per il POC è accettabile.
2. **Consistenza visiva**: L'AI potrebbe generare UI che non matcha il design system. Mitigazione: prompt engineering forte + vincoli espliciti.
3. **Tempi di generazione**: Il loop generate → test → fix può essere lento (30-60 sec). Il progress bar mitiga la percezione ma serve un buon UX.
4. **Max tentativi**: Se l'AI non riesce in 5 tentativi, l'esperienza utente degrada. Mitigazione: prompt examples molto solidi per i casi comuni.

### Domande Aperte
1. **Nome definitivo del progetto?** "MorphCRM" è un placeholder — va bene o preferisci altro?
2. **Demo scriptata?** Per il POC, vuoi che alcune feature siano pre-generate (così la demo è affidabile al 100%) o vuoi tutto live?
3. **Video / landing page?** Il POC avrà una landing page che spiega la tesi, o è solo l'app?
4. **Le feature generate possono interagire coi dati mock del CRM?** Es. "Mostrami i lead che non contatto da 30 giorni" — questo richiede accesso ai dati mock delle altre pagine.
