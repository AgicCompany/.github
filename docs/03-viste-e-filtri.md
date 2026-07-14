# 03 — Viste e filtri

Come sono configurate le viste dei template di progetto e come gestire board, filtri, gerarchia
e — a seconda del metodo — sprint (Scrum) o flusso continuo (Kanban).

> Vale per entrambi i template dell'organizzazione: **`agic_scrum_template`** (#8) e
> **`agic_kanban_template`** (#9). Partono da set di viste diversi (vedi sotto): lo Scrum ha viste
> per sprint e Story Points, il Kanban un set piu snello centrato sul flusso. Per creare un
> progetto da template vedi [guida 02](02-creazione-progetti-da-template.md).

## Viste del template Scrum

| Vista | Layout | Filtro | Note |
|-------|--------|--------|------|
| **Backlog** | Table | `type:"Epic","Impediment",Bug,Spike` | Elementi di prodotto |
| **Sprint backlog** | Table | `iteration:@current type:"User story","Task","Bug",Impediment` | Lavoro dello sprint |
| **Sprint board** | Board | `iteration:@current type:"User story","Task","Bug","Impediment"` | Column field = Status |
| **Sprint breakdown** | Table | `type:"User story","Task","Bug",Impediment` | Group by Iteration |
| **Roadmap** | Roadmap | `type:Epic,Feature` | Group by Parent issue |
| **Bug tracking** | Table | `type:Bug` | Colonne Priority, Severity |
| **Impediment tracking** | Table | `type:Impediment` | — |
| **Alert attivi** | Table | `-no:"🚨 Alert"` | Solo item con un alert attivo (vedi [guida 04](04-project-alerts.md)) |

## Viste del template Kanban

Il template Kanban ha un set piu snello, centrato sul **flusso** anziche sugli sprint: niente
Iteration ne Story Points.

| Vista | Layout | Filtro | Note |
|-------|--------|--------|------|
| **Board** | Board | (nessuno) | Column field = Status; vista principale, con limiti **WIP** per colonna |
| **Backlog** | Table | `type:"Epic","Feature","User story","Task","Bug","Impediment","Spike"` | Coda del lavoro da prendere in carico |
| **Bug tracking** | Table | `type:Bug` | Colonne Priority, Severity |
| **Alert attivi** | Table | `-no:"🚨 Alert"` | Solo item con un alert attivo (vedi [guida 04](04-project-alerts.md)) |

> Nel Kanban il lavoro **scorre** tra gli stati della board (`Backlog → Ready → In Progress →
> In Review → Done`, piu `Blocked`) senza time-box: non esistono viste Sprint. Il carico si
> controlla con i **limiti WIP** per colonna, impostabili dalla UI della Board.

## Filtrare per sprint corrente (Scrum)

Il campo **Iteration** (tipo nativo) abilita il filtro dinamico:

| Filtro | Mostra |
|--------|--------|
| `iteration:@current` | sprint in corso (si aggiorna da solo) |
| `iteration:@previous` / `@next` | sprint precedente / successivo |
| `no:iteration` | item senza sprint |
| `-iteration:@current` | tutto tranne lo sprint corrente |

> Per usarlo serve un campo di tipo **Iteration** (non un single-select). Va creato e popolato
> con le iterazioni (durata sprint); GitHub calcola da solo quella "corrente".

## Gestire il flusso (Kanban)

Senza sprint, il Kanban ragiona per **stato** e **anzianita** nella colonna. Filtri utili:

| Filtro | Mostra |
|--------|--------|
| `status:"In Progress"` | tutto il lavoro in corso (per controllare il WIP) |
| `status:Blocked` | item fermi per un impedimento |
| `-status:Done,Removed` | tutto il lavoro ancora aperto |
| `no:assignees status:"In Progress"` | item in corso senza responsabile |

> Il carico si tiene sotto controllo con i **limiti WIP** per colonna (UI della Board) e con le
> metriche di **throughput** calcolate dalle automazioni (vedi [guida 05](05-automazioni-processo.md)):
> e l'equivalente Kanban della velocity di Scrum.

## Filtrare per tipo

GitHub **non** permette di vincolare un campo a certi tipi di issue (a differenza di ADO). Per
ottenere lo stesso effetto, si filtrano le **viste** per tipo:

```
type:"User story","Task","Bug"
```

Cosi l'Iteration "conta" solo dove serve, anche se tecnicamente ogni issue puo averla.
Le virgolette servono per i tipi con spazio (es. `"User story"`).

## Gerarchia Epic → Feature → User story → Task

La gerarchia si basa sulle **sub-issues** (relazione parent/child), non sui filtri.

- I filtri sono **piatti**: `type:Epic` mostra solo le Epic, non i figli.
- Per vedere l'albero annidato: vista **Table** → **Group by → Parent issue** (o l'annidamento
  sub-issues). E l'equivalente del backlog gerarchico di Azure DevOps.
- ⚠️ Un filtro **non** "risale" ai genitori: filtrando per sprint potresti vedere una Story senza
  la sua Epic se l'Epic non e nello stesso sprint.

| Obiettivo | Come |
|-----------|------|
| Vedere Epic→Feature→Story annidate | Group by Parent issue (NON filtri) |
| Vedere solo un ramo | Group by Parent + scorri all'Epic |
| Filtro che include i parent | ❌ Non esiste |

## Stati (campo Status)

Il campo **Status** e un single-select condiviso da tutti i tipi di issue. Il set di stati dipende
dal template: nel **Kanban** e snello (`Backlog → Ready → In Progress → In Review → Done`, piu
`Blocked`); nel **Scrum** puo essere piu esteso, ad esempio:
New → In analysis → Ready to work → Approved → To Do → In Progress →
Ready for qa → Validated by QA → Done → Removed.

> Differenza da ADO: lo Status e **unico e condiviso** tra tutti i tipi (non esistono stati
> per-tipo) e non c'e enforcement delle transizioni. Le viste filtrano per tipo, ma lo Status
> resta lo stesso set per tutti.

## Limiti rispetto ad Azure DevOps

| | Azure DevOps | GitHub Projects |
|---|---|---|
| Stati per work item type | Si | No (Status unico) |
| Campi vincolati al tipo | Si | No |
| Backlog gerarchico | Si | Si (sub-issues + Group by Parent) |
| Filtro che risale ai parent | Si | No |
| Burndown con linea ideale | Si | No (chart base) |
| Viste configurabili via API | n/a | No (solo UI) |
