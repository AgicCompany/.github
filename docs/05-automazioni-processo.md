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
  - **WIP** (item in lavorazione), **bloccati**, scaduti, in scadenza, impediment aperti;
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

### Grafici interattivi (Insights) — setup UI una-tantum
Le **Insights** dei Project non sono configurabili via API: si impostano dalla UI (e vengono
ereditate dai progetti creati dal template). Per una velocity chart:

1. Apri il progetto → scheda **Insights** → **New chart**.
2. Layout **Column** (o Bar).
3. Asse X: **Iteration**; Asse Y: **Sum** di **Effort (numeric)**.
4. Filtro: `is:done` (o `Status:Done`) per la velocity dei soli completati.
5. Salva con nome **Velocity**. Aggiungi una seconda chart *committed vs done* se utile.

> **Kanban**: al posto della velocity per iteration, crea una chart di **throughput** — asse X
> per **data di completamento** (o settimana) e conteggio degli item `is:done`, per visualizzare
> quanti item vengono chiusi nel tempo.

## 🔍 Conformità dei progetti (read-only)

- **File**: `scripts/project-conformance.mjs` + `.github/workflows/project-conformance.yml`.
- **Scopo**: individuare i progetti **fuori standard** — creati a mano invece che dal template —
  prima che le altre automazioni li saltino in silenzio (es. un progetto senza il campo `🚨 Alert`
  non riceve alert e nessuno se ne accorge). È **solo lettura**: non modifica mai i progetti.
- **Cosa verifica** rispetto ai template `#8 agic_scrum` / `#9 agic_kanban`:
  - **Campi obbligatori** (hard): `Status`, `Priority`, `Severity`, `Effort level`, `🚨 Alert`,
    `Target date`.
  - **Opzioni del campo Status** — classificate in quattro casi per evitare falsi positivi:
    - `standard` → le 7 opzioni standard presenti (`Backlog, Ready, In Progress, In Review, Done, Blocked, Removed`);
    - `personalizzato` → workflow del cliente diverso ma **voluto** (opzioni custom oltre lo standard) → conforme, segnalato come **warning**;
    - `incompleto` → sottoinsieme dello standard con opzioni mancanti → **gap** da sanare (blocca la conformità);
    - `default` → Status di GitHub mai configurato (`Todo/In Progress/Done`) → progetto da allineare (blocca la conformità).
  - **Viste attese** (soft, solo warning): set standard Scrum/Kanban (Backlog, board, Roadmap,
    Bug/Impediment tracking, Alert attivi, ecc.).
  - Il **metodo** (Scrum/Kanban) è rilevato automaticamente dalla presenza del campo Iteration.
- **Verdetto**: ✅ conforme · ⚠️ conforme con warning (Status personalizzato o viste mancanti) ·
  ❌ non conforme (campi mancanti oppure Status `incompleto`/`default`).
- **Output (due forme):**
  1. **`metrics/conformance.md`** — report leggibile: tabella per progetto (metodo, esito, campi /
     opzioni / viste mancanti) più una sezione con l'azione consigliata per i non conformi.
  2. **`metrics/conformance.csv`** — dati grezzi storicizzabili.
- **Rimedio**: per i progetti non conformi, ricrearli dal template oppure allineare manualmente i
  campi/opzioni mancanti. La *riparazione automatica* è volutamente **fuori scope** (rischio di
  scritture indesiderate su progetti reali).

## Credenziali e configurazione

- Usano il secret **`PROJECTS_TOKEN`** (PAT con scope `project` + `read:org`) e le variabili
  `PROJECT_OWNER` / `OWNER_TYPE`, come gli Alert.
- Vocabolario Scrum condiviso (stati, tipi, nomi campi) nel modulo `scripts/lib/projects.mjs`
  (oggetto `CONFIG`): adattare ai valori effettivi dei progetti.

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
| `scripts/project-digest.mjs` | Digest → status update (Scrum/Kanban) |
| `scripts/project-metrics.mjs` | Velocity (Scrum) / Throughput (Kanban) → README + CSV |
| `scripts/project-conformance.mjs` | Report read-only di conformità → `metrics/conformance.md` + `.csv` |
| `metrics/velocity.csv` | Dati grezzi velocity (progetti Scrum) |
| `metrics/throughput.csv` | Dati grezzi throughput settimanale (progetti Kanban) |
| `metrics/conformance.md` / `.csv` | Report di conformità dei progetti org-wide (read-only) |
