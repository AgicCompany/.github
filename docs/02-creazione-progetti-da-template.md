# 02 — Creazione progetti da template

Come creare un nuovo GitHub Project di lavoro a partire da un template dell'organizzazione,
con viste e campi gia preconfigurati.

## Cosa otterrai

Al termine avrai un **Project board di lavoro gia pronto**, senza configurazione manuale:

- **viste e campi** copiati dal template (Backlog, Sprint/Board, campi Status, Priority, Story
  Points, ecc. a seconda del metodo);
- il campo **🚨 Alert** attivo: gli item a rischio verranno evidenziati in automatico dalle
  automazioni centralizzate;
- una sezione **⚙️ Automazioni** nella descrizione (README) del board, che spiega cosa fa il sistema;
- (con lo script `-CreateRepo`) una **repository gia creata e agganciata** al progetto.

> Un **item** e una voce del Project: tipicamente una issue collegata (o una draft creata nel board).

## I template disponibili

L'organizzazione espone due Project marcati come *template*, a seconda del metodo di gestione:

| Template | Metodo | Contenuto |
|----------|--------|-----------|
| **`agic_scrum_template`** (#8) | Scrum | 8 viste (Backlog, Sprint backlog/board/breakdown, Roadmap, Bug tracking, Impediment tracking, Alert attivi); campi Status (stati Scrum), Priority, Effort level, **Iteration**, Severity, Start/Target date, 🚨 Alert. La **stima** usa l'Issue Field org-level **Effort (numeric)** |
| **`agic_kanban_template`** (#9) | Kanban | viste di flusso (Board per Status con WIP, Backlog, Bug tracking, Alert attivi); campi Status (Backlog/Ready/In Progress/In Review/Done/Blocked), Priority, Effort level, Severity, Start/Target date, 🚨 Alert — **senza** Iteration (usa il throughput) |

Entrambi partono con **0 item** (sono puliti). Scegli quello adatto al metodo del progetto.

## Come funziona un "template" di Project

Quando crei un progetto dal template, GitHub fa una **copia una-tantum** del template:
viste, campi e configurazione vengono duplicati al momento della creazione.

> ⚠️ **Limite**: e una copia **congelata**. Se in futuro modifichi il template, i progetti
> gia creati **non** si aggiornano. Le viste non sono modificabili via API, quindi non esiste
> un modo per "ri-sincronizzare". Conseguenza pratica: **stabilizza il template prima** di
> creare i progetti di lavoro.

## Metodo A — Da UI (semplice)

1. Vai su *Organizzazione → Projects → New project*.
2. Nella sezione **Templates** scegli **`agic_scrum_template`** o **`agic_kanban_template`**
   in base al metodo del progetto.
3. Dai un nome (convenzione: `agic-<cliente>-<progetto>`).
4. Aggancia la repo: nel progetto, *Settings → Manage access / Repositories* oppure aggiungi
   le issue con `Add items`.

## Metodo B — Da script (ripetibile, consigliato)

Lo script `new-project-from-template.ps1` (in questa cartella `docs/`) clona un template via API
e, opzionalmente, aggancia subito una repo. Con `-Method` scegli quale template usare.

```powershell
# Scrum (default)
./new-project-from-template.ps1 -Title "agic-cliente-progetto" -RepoToLink "AgicCompany/nome-repo"
# Kanban
./new-project-from-template.ps1 -Title "agic-cliente-progetto" -Method kanban -RepoToLink "AgicCompany/nome-repo"
```

Cosa fa:
1. `copyProjectV2` dal template scelto → nuovo progetto con viste e campi gia presenti
2. (opz.) `linkProjectV2ToRepository` → aggancia la repo indicata
3. **`setup` Alert** → allinea il campo 🚨 Alert e scrive la sezione *⚙️ Automazioni* nella
   descrizione (**README del board Project**, non quello della repo — lo si vede aprendo il
   progetto); si salta con `-SkipSetup`.

A fine esecuzione lo script stampa l'**URL del nuovo progetto**.

#### Prerequisiti

Lo script esegue un **preflight** all'avvio e si ferma con un messaggio chiaro se qualcosa manca.
Per usarlo servono:

- **PowerShell** (Windows nativo; su macOS/Linux installare PowerShell Core `pwsh`).
- **[GitHub CLI `gh`](https://cli.github.com/)** installato e autenticato (`gh auth login`).
- Token `gh` con scope **`project`**, **`read:org`**, **`repo`**. Se manca `project`:
  `gh auth refresh -s project -s read:org -s repo`.
- **Node.js 20** (necessario per lo step `setup`; non serve se usi `-SkipSetup`).
- Eseguire lo script **dentro un clone di `AgicCompany/.github`** (richiama `../scripts/project-alerts.mjs`).
- Essere **membro dell'organizzazione `AgicCompany`** con i permessi di creare Project e repository.

### Self-service in un solo passo (crea anche la repo)

Con `-CreateRepo` lo script **crea la repo** indicata se non esiste ancora (visibilita `private`
di default, override con `-RepoVisibility public|internal`), la aggancia al progetto ed esegue il
setup Alert — tutto in un comando:

```powershell
./new-project-from-template.ps1 -Title "agic-acme-shop" -RepoToLink "AgicCompany/acme-project" -CreateRepo
```

Risultato: progetto da template + repo pronta e agganciata + campo Alert e sezione automazioni
gia configurati, senza passaggi manuali.

### Verifica il risultato

1. Apri l'**URL** stampato dallo script (o *Organizzazione → Projects*).
2. Controlla che ci siano le **viste** del template e la vista *🚨 Alert attivi*.
3. In una vista, verifica la presenza del campo **🚨 Alert** tra i campi.
4. Nella **descrizione/README del board** (menu `⋯` → *Settings* del progetto) deve comparire la
   sezione **⚙️ Automazioni**.
5. Se hai usato `-CreateRepo`, la repository risulta **agganciata** (menu progetto → *Settings →
   Repositories*).

> Gli alert vengono valorizzati al successivo giro schedulato del workflow (vedi guida 04); non
> compaiono nell'istante della creazione.

## Aggiornare progetti gia esistenti

| Cosa vuoi propagare | Possibile dopo la creazione? |
|---------------------|------------------------------|
| Nuovo **campo** o opzione di Status | ✅ Si, via API (script) |
| Modifica a **viste/filtri/chart** | ❌ No (solo a mano dalla UI) |

Per i campi e possibile uno script di allineamento additivo; per le viste, replica manuale.

## Automazioni di processo sui progetti

Sui progetti sono attive automazioni centralizzate (girano nel repo `.github`): **alert** sugli item,
**digest** settimanale e **metriche di velocity**. Dettagli nelle guide [04](04-project-alerts.md) e
[05](05-automazioni-processo.md).

- I **nuovi** progetti creati da un template ereditano il campo 🚨 Alert e vengono processati in automatico.
  Le automazioni si **adattano al metodo** del progetto (Scrum: velocity/sprint · Kanban: throughput/flusso).
- I progetti **gia esistenti** prima dell'aggiunta del campo richiedono un `setup` una-tantum (vedi guida 04).

## Manutenzione del template

Se vuoi evolvere lo standard (nuove viste, filtri, campi):
1. Modifica un progetto "di riferimento" gia configurato come vuoi.
2. Clonalo con `copyProjectV2`, svuotalo e marcalo come template (`markProjectV2AsTemplate`).
3. Aggiorna il PID corrispondente in `$TEMPLATE_PIDS` nello script `new-project-from-template.ps1`.

Questo evita di ricostruire le viste a mano: si riusa il lavoro gia fatto su un progetto reale.
