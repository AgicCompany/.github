# Report di conformita' progetti (org-wide)

_Read-only · agg. 2026-09-21 · 15 progetti analizzati · 11 non conformi · 2 con warning_

Standard di riferimento: template **#8 agic_scrum** / **#9 agic_kanban**.
La conformita' "hard" richiede tutti i campi obbligatori e uno Status **standard** o **personalizzato**.

Classificazione Status:
- **standard** — le 7 opzioni standard presenti;
- **personalizzato** — workflow del cliente diverso ma voluto → conforme, segnalato come warning;
- **incompleto** — sottoinsieme dello standard con opzioni mancanti → gap da sanare;
- **default** — Status di GitHub mai configurato (Todo/In Progress/Done) → progetto da allineare.

Verdetto: ✅ conforme · ⚠️ conforme con warning · ❌ non conforme.

| # | Progetto | Metodo | Verdetto | Status | Campi mancanti | Opzioni Status mancanti | Viste mancanti |
|---|----------|--------|:--------:|--------|----------------|-------------------------|----------------|
| 1 | @KeyserDSoze's untitled project | kanban | ❌ | default | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 4 | @lorenzotestiagic's untitled project | kanban | ❌ | default | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 5 | @marziamariottoagic_testScrum | kanban | ❌ | default | Severity, Effort level, 🚨 Alert, Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 15 | @giuseppemontanaroagic's untitled project | kanban | ❌ | default | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 17 | @danieleincalzaagic's untitled project | kanban | ❌ | default | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 18 | isok-bcproject | kanban | ❌ | incompleto | — | Removed | — |
| 19 | ferroli/hydra | kanban | ❌ | default | Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 20 | ucan/servizi_al_cittadino | scrum | ❌ | default | Target date | Backlog, Ready, In Review, Blocked, Removed | Backlog, Sprint backlog, Sprint board, Sprint breakdown, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 23 | alperia-lava | kanban | ❌ | incompleto | — | Removed | — |
| 24 | ferroli-hydra | kanban | ❌ | incompleto | — | Removed | — |
| 25 | isoki-bc_customization | kanban | ❌ | incompleto | — | Removed | — |
| 10 | GitHub Adoption | kanban | ✅ | standard | — | — | — |
| 13 | Isokinetic Implementation | kanban | ✅ | standard | — | — | — |
| 21 | ce-demo/esa_germany | scrum | ⚠️ | personalizzato | — | Backlog, Ready, In Review, Blocked | — |
| 26 | ucan-servizi_al_cittadino | scrum | ⚠️ | personalizzato | — | Backlog, Ready, In Review, Blocked | — |

## ❌ Non conformi — azione consigliata
- **#1 @KeyserDSoze's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#4 @lorenzotestiagic's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#5 @marziamariottoagic_testScrum** — campi mancanti: Severity, Effort level, 🚨 Alert, Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#15 @giuseppemontanaroagic's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#17 @danieleincalzaagic's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#18 isok-bcproject** — opzioni Status mancanti: Removed. Ricrearlo da template o allineare campi/Status.
- **#19 ferroli/hydra** — campi mancanti: Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#20 ucan/servizi_al_cittadino** — campi mancanti: Target date; Status di GitHub mai configurato (Todo/In Progress/Done). Ricrearlo da template o allineare campi/Status.
- **#23 alperia-lava** — opzioni Status mancanti: Removed. Ricrearlo da template o allineare campi/Status.
- **#24 ferroli-hydra** — opzioni Status mancanti: Removed. Ricrearlo da template o allineare campi/Status.
- **#25 isoki-bc_customization** — opzioni Status mancanti: Removed. Ricrearlo da template o allineare campi/Status.

## ⚠️ Conformi con warning
- **#21 ce-demo/esa_germany** — Status personalizzato (workflow cliente).
- **#26 ucan-servizi_al_cittadino** — Status personalizzato (workflow cliente).
