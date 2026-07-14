# Processi GitHub — AgicCompany

Documentazione operativa per gestire **progetti, template e issue** nell'organizzazione
`AgicCompany` su GitHub, con supporto sia al modello **Scrum** sia al modello **Kanban**,
in coerenza con le metodologie gia in uso su Azure DevOps.

## Indice

| Guida | Argomento |
|-------|-----------|
| [01 — Issue Types e Template](01-issue-types-e-template.md) | Tipi di issue org-level, Issue Form, repo `.github` |
| [02 — Creazione progetti da template](02-creazione-progetti-da-template.md) | Clonare i template Scrum/Kanban, agganciare repo, script |
| [03 — Viste e filtri](03-viste-e-filtri.md) | Viste Scrum e Kanban, sprint/iteration, flusso/WIP, gerarchia, filtri per tipo |
| [04 — Project Alerts (automazione)](04-project-alerts.md) | Campo Alert, regole Scrum/Kanban, workflow run-all, viste filtrate |
| [05 — Automazioni di processo](05-automazioni-processo.md) | Digest settimanale (status update), metriche/velocity, Insights |

## Architettura in breve

```mermaid
flowchart TD
    ORG["Organizzazione AgicCompany"]

    ORG --> TYPES["Issue Types<br/>(Settings)"]
    ORG --> GH["Repo .github (public)"]
    ORG --> TPL["Project template<br/>agic_scrum_template · agic_kanban_template"]
    ORG --> WORK["Progetti di lavoro<br/>(1 per repo/cliente)"]

    TYPES --> T1["Epic · Feature · User story<br/>Task · Bug · Impediment · Spike"]

    GH --> FORMS[".github/ISSUE_TEMPLATE/<br/>7 Issue Form .yml"]
    GH --> DOCS["docs/<br/>queste guide"]
    GH --> ALERTS["workflow automazioni<br/>(Alert · Digest · Velocity/Throughput)"]

    TPL -.->|copyProjectV2<br/>viste + campi| WORK
    FORMS -.->|default org-wide| WORK
    TYPES -.->|tipi disponibili| WORK
    ALERTS -.->|aggiornano board, status update, velocity/throughput| WORK

    classDef org fill:#1f6feb,stroke:#0b3d91,color:#fff;
    classDef node fill:#eef3fb,stroke:#1f6feb,color:#0b1f44;
    class ORG org;
    class TYPES,GH,TPL,WORK,T1,FORMS,DOCS,ALERTS node;
```

> La copia del template (`copyProjectV2`) e i default della repo `.github` sono **una-tantum
> alla creazione** del progetto: vedi i limiti nella tabella sotto.

## Concetti chiave (e i loro limiti)

| Concetto | Come funziona | Limite da ricordare |
|----------|---------------|---------------------|
| **Issue Types** | Definiti a livello org, condivisi da tutte le repo | — |
| **Issue Template** | Default org nella repo `.github` (deve essere **public**) | Una repo con propria cartella `ISSUE_TEMPLATE` fa override |
| **Project template** | Clonato alla creazione (viste/campi inclusi) | E una **copia**: modifiche al template NON si propagano ai progetti gia creati |
| **Viste / filtri** | Configurabili solo da UI | **Non scrivibili via API** |
| **Campi custom** | Creabili/valorizzabili via API | Le viste no |
| **Project Alerts** | Workflow schedulato nel repo `.github` aggiorna il campo 🚨 Alert via API | Richiede il secret `PROJECTS_TOKEN` (PAT con scope `project`) |
| **Digest / Metriche** | Workflow schedulati pubblicano status update e metriche — velocity (Scrum) o throughput (Kanban) — su README + CSV | Status update non eseguibili sui Project template |

## Per iniziare

- Creare un nuovo progetto di lavoro → vedi [Guida 02](02-creazione-progetti-da-template.md)
- Capire i tipi di issue e i form → vedi [Guida 01](01-issue-types-e-template.md)
- Configurare board, sprint/flusso e gerarchia → vedi [Guida 03](03-viste-e-filtri.md)
- Capire gli alert automatici sugli item → vedi [Guida 04](04-project-alerts.md)
- Digest settimanale e metriche (velocity in Scrum · throughput in Kanban) → vedi [Guida 05](05-automazioni-processo.md)

