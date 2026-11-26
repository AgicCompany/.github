# 05 — Automazioni di processo (Digest, Metriche e Conformità)

Automazioni centralizzate che, come gli [Alert](04-project-alerts.md), girano nel repo `.github`
e agiscono via API su tutti i progetti dell'organizzazione `AgicCompany`. Nessuna
configurazione per progetto: i nuovi progetti vengono coperti automaticamente.

> **Adattamento al metodo**: Digest e Metriche rilevano se il progetto è **Scrum** (ha il campo
> Iteration) o **Kanban** (flusso continuo, senza sprint) e producono l'output coerente — velocity
> per sprint nello Scrum, throughput settimanale nel Kanban.

> I progetti **template** e chiusi sono esclusi (l'API rifiuta scritture come gli status update
> sui template).

## Quadro d'insieme

| Automazione | Cosa produce | Dove si legge | Cadenza |
|-------------|--------------|---------------|---------|
| 🚨 Alert | Campo colorato sugli item | Board / viste | 2×/giorno |
| 🗓️ Digest | Project **status update** (Scrum: sprint · Kanban: flusso) | Menu progetto → *Status updates* | Lunedi 07:00 UTC |
| 📈 Metriche | **Velocity** (Scrum) o **Throughput** (Kanban) nel README + CSV | README + `metrics/velocity.csv` / `metrics/throughput.csv` | Lunedi 05:00 UTC |
| 🔍 Conformità | Report **read-only** dei progetti fuori standard | `metrics/conformance.md` / `.csv` | Lunedi 06:00 UTC |

## 🗓️ Digest settimanale

- **File**: `scripts/project-digest.mjs` + `.github/workflows/project-digest.yml`.
- **Scrum** — pubblica una **Project status update** con:
  - sprint corrente (item e stima `Effort (numeric)` completati su totali, % completamento);
  - conteggio di scaduti, in scadenza, impediment aperti, item in corso;
  - mini-tabella **velocity** degli ultimi sprint.
- **Kanban** — pubblica una status update di **flusso** con:
  - **WIP** (status nativo In progress/In review, esclusi i bloccati), **bloccati** (Issue Field `Blocked` = `Yes`),
    scaduti, in scadenza, impediment aperti;
  - item **completati la settimana scorsa** e mini-tabella **throughput** delle ultime settimane.
- **Stato** (badge della status update) derivato automaticamente:
  - `OFF_TRACK` se ci sono item scaduti;
  - `AT_RISK` se ci sono impediment aperti, item bloccati (Kanban) o scadenze imminenti;
  - `ON_TRACK` altrimenti.
- **Dove si legge**: menu del progetto → *Status updates* (compare anche nella home del progetto).

## 📈 Metriche / Velocity (Scrum) e Throughput (Kanban)

- **File**: `scripts/project-metrics.mjs` + `.github/workflows/project-metrics.yml`.
- **Scrum** — per ogni iteration: stima `Effort (numeric)` prevista/completata, item previsti/completati,
  % completamento; velocity media (effort completato) sugli ultimi sprint.
- **Kanban** — per ogni settimana ISO: numero di item **completati** (throughput), con media
  settimanale. Basato su `closedAt` (fallback `updatedAt`).
- **Output (sempre due forme):**
  1. **Visivo** — sezione **📈 Velocity** (Scrum) o **📈 Throughput** (Kanban) nel **README del
     progetto**, con barre proporzionali e tabella.
  2. **Dati grezzi** — CSV committato nel repo: **`metrics/velocity.csv`** (Scrum) e
     **`metrics/throughput.csv`** (Kanban), storicizzabili e importabili in Excel/BI.
- Il README riporta anche il link diretto al CSV. La stessa metrica compare in forma sintetica nel
  digest settimanale.

### Grafici interattivi (Insights) nei template
Le **Insights** dei Project non sono configurabili via API: si impostano dalla UI. I template
contengono già i grafici qui sotto, e un progetto creato da template li riceve con la copia.
I progetti creati prima del 26/11/2026 non li hanno: si possono ricreare a mano con la stessa
configurazione (scheda **Insights** → **New chart** → **Configure** e filtro).

| Grafico | Template | Layout | Asse X | Gruppi | Asse Y | Filtro |
|---|---|---|---|---|---|---|
| Burn up (predefinito) | entrambi | — | Time | — | — | `is:issue` |
| **Velocity** | Scrum | Column | Iteration | — | Sum di Effort (numeric) | `status:Done` |
| **Avanzamento sprint** | Scrum | Stacked column | Iteration | Status | Count of items | `type:"User story","Task","Bug","Impediment"` |
| **Flusso cumulativo** | Kanban | Stacked area | Time | Status (automatico) | Count of items | — |
| **Throughput** | Kanban | Line | Time | — | Count of items | `status:Done` |
| **Carico per persona** | entrambi | Bar | Assignees | Status | Count of items | `-status:Done,"Not planned",Duplicate` |
| **Bug per severità** | entrambi | Column | Severity | Priority | Count of items | `type:Bug -status:Done,"Not planned",Duplicate` |
| **Alert attivi** | entrambi | Bar | 🚨 Alert | — | Count of items | `-no:🚨-alert` |

> Con asse X = **Time** il grafico è storico e GitHub raggruppa per Status. Il **Throughput**
> mostra quanti item sono in Done nel tempo: la pendenza della linea è il ritmo di
> completamento. Il dato settimanale esatto è nel CSV `metrics/throughput.csv`.

## 🔍 Conformità dei progetti (read-only)

- **File**: `scripts/project-conformance.mjs` + `.github/workflows/project-conformance.yml`.
- **Scopo**: individuare i progetti **fuori standard** — creati a mano invece che dal template —
  prima che le altre automazioni li saltino in silenzio (es. un progetto senza il campo `🚨 Alert`
  non riceve alert e nessuno se ne accorge). È **solo lettura**: non modifica mai i progetti.
- **Cosa verifica** rispetto ai template `#8 agic_scrum` / `#9 agic_kanban`:
  - **Campi obbligatori** (hard): `Status`, `Priority`, `Severity`, `Effort level`, `🚨 Alert`,
    `Target date`.
  - **Opzioni del campo Status** — il campo e lo **specchio** dello status nativo delle issue:
    - `nativo` → esattamente le 7 opzioni native (`Backlog, Todo, In progress, In review, Done, Not planned, Duplicate`);
    - `da migrare` → contiene vecchie opzioni AGIC mappabili (`Ready`, `Blocked`, `Removed`, stati Scrum) → conforme, segnalato come **warning** finche non si esegue la migrazione;
    - `non mappabile` → contiene opzioni senza equivalente nativo → gli script non le interpretano (blocca la conformità);
    - `incompleto` → solo nomi nativi ma non tutti (es. Status di default di GitHub `Todo/In Progress/Done`) → da allineare (blocca la conformità).
  - **Viste attese** (soft, solo warning): set standard Scrum/Kanban (Backlog, board, Roadmap,
    Bug/Impediment tracking, Alert attivi, ecc.).
  - Il **metodo** (Scrum/Kanban) è rilevato automaticamente dalla presenza del campo Iteration.
- **Verdetto**: ✅ conforme · ⚠️ conforme con warning (Status da migrare o viste mancanti) ·
  ❌ non conforme (campi mancanti oppure Status `non mappabile`/`incompleto`).
- **Output (due forme):**
  1. **`metrics/conformance.md`** — report leggibile: tabella per progetto (metodo, esito, campi /
     opzioni / viste mancanti) più una sezione con l'azione consigliata per i non conformi.
  2. **`metrics/conformance.csv`** — dati grezzi storicizzabili.
- **Rimedio**: per i progetti non conformi, ricrearli dal template oppure allineare manualmente i
  campi/opzioni mancanti. Per lo Status `da migrare` usare lo script di migrazione (sezione sotto).
  La conformità resta **read-only**: non ripara nulla da sola.

## 🔁 Migrazione allo status nativo delle issue

> ⚠️ Lo status nativo delle issue e in **public preview** (non GA).

- **File**: `scripts/migrate-native-status.mjs` — un progetto per volta, **dry-run per default**.
- **Cosa fa** (con `--apply`):
  1. salva uno **snapshot JSON** del progetto in `migration-snapshots/` (escluso da git) per il rollback;
  2. imposta lo **status nativo** di ogni issue dal valore del board (corrispondenza nella
     [guida 03](03-viste-e-filtri.md#stati-status-nativo-delle-issue)); issue aperte senza valore →
     Backlog; issue **chiuse** → sempre lo stato coerente col motivo di chiusura; `Blocked` → Issue Field `Blocked` = `Yes`;
  3. sostituisce le opzioni del campo Status con i 7 nomi nativi e i colori standard, **riusando gli ID**
     delle opzioni esistenti (i valori sugli item restano); su un progetto gia migrato aggiorna solo i colori;
  4. riallinea il campo Status del board allo status nativo (draft: nome nativo del vecchio valore).
- **Regole di sicurezza**: non riapre mai un'issue chiusa e non ne cambia il motivo di chiusura;
  chiude un'issue aperta (board `Done` o `Removed`) solo con `--allow-close`; salta e segnala le issue
  con valori in conflitto su altri board. Gli item saltati restano invariati sul board per la revisione
  manuale; se un item saltato usa un'opzione che verrebbe eliminata (es. `Blocked`), lo script si
  ferma prima di scrivere. Un errore su un singolo item non interrompe la migrazione: viene elencato
  a fine esecuzione insieme al percorso dello snapshot.
- **Esecuzione** (in locale, con un token che abbia scope `project` e `repo`; l'account deve avere almeno
  il ruolo **Triage** su tutte le repo delle issue del progetto, altrimenti lo status nativo di quelle
  issue non si puo impostare e lo script le segnala come errori):
  ```powershell
  $env:GITHUB_TOKEN = gh auth token; $env:PROJECT_OWNER = 'AgicCompany'
  node scripts/migrate-native-status.mjs --project <n>            # dry-run: legge e stampa il piano
  node scripts/migrate-native-status.mjs --project <n> --apply    # esegue
  ```
- **Passi manuali dopo la migrazione** (non esposti dall'API): aggiornare in UI i filtri delle viste
  che usano i vecchi nomi (es. `status:Blocked`, `-status:Done,Removed`), le Insights e i limiti WIP
  delle colonne rinominate; verificare i workflow di progetto (attivi solo *Auto-add sub-issues to project*
  e *Item added to project* → Backlog, solo Issues, come nei template: vedi [guida 02](02-creazione-progetti-da-template.md#workflow-di-progetto-richiesti-sui-template)).

## Credenziali e configurazione

- Usano il secret **`PROJECTS_TOKEN`** (fine-grained PAT: Issues e Pull requests read-only sulle repo, Projects read
  and write sull'organizzazione; vedi [guida 04](04-project-alerts.md#credenziali)) e le variabili
  `PROJECT_OWNER` / `OWNER_TYPE`, come gli Alert.
- Nomi dei campi e tipi nel modulo `scripts/lib/projects.mjs` (oggetto `CONFIG`); logica degli stati
  (status nativo, vecchi nomi, Issue Field `Blocked`) nel modulo `scripts/lib/status.mjs`.

## Descrizione nei progetti
Il comando `setup` (vedi [guida 04](04-project-alerts.md)) scrive nel README di ogni progetto una
sezione **⚙️ Automazioni & impostazioni** che riassume Alert, Digest e metriche (Velocity per Scrum,
Throughput per Kanban) con i link a queste guide (che fanno da "sotto-pagine" di dettaglio). Il README
segue il flusso: info progetto → 📈 metrica → ⚙️ impostazioni, per restare leggibile.

## Limiti noti
- Insights/viste: gestibili **solo da UI**, nessuna API.
- Status update: non eseguibili sui **Project template**.
- `GITHUB_TOKEN` di default non scrive i Project di organizzazione: serve il PAT.

## File di riferimento

| File | Ruolo |
|------|-------|
| `scripts/lib/projects.mjs` | Helper condivisi (GraphQL, item, iteration, throughput, README) |
| `scripts/lib/status.mjs` | Stati degli item da status nativo, vecchi nomi e Issue Field `Blocked` (+ test `status.test.mjs`) |
| `scripts/migrate-native-status.mjs` | Migrazione di un progetto allo status nativo (dry-run per default) |
| `scripts/project-digest.mjs` | Digest → status update (Scrum/Kanban) |
| `scripts/project-metrics.mjs` | Velocity (Scrum) / Throughput (Kanban) → README + CSV |
| `scripts/project-conformance.mjs` | Report read-only di conformità → `metrics/conformance.md` + `.csv` |
| `metrics/velocity.csv` | Dati grezzi velocity (progetti Scrum) |
| `metrics/throughput.csv` | Dati grezzi throughput settimanale (progetti Kanban) |
| `metrics/conformance.md` / `.csv` | Report di conformità dei progetti org-wide (read-only) |
