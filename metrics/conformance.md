# Report di conformita' progetti (org-wide)

_Read-only · agg. 2026-11-26 · 40 progetti analizzati · 8 non conformi · 1 con warning_

Standard di riferimento: template **#8 agic_scrum** / **#9 agic_kanban**.
La conformita' "hard" richiede tutti i campi obbligatori e uno Status **nativo** o **da migrare**.

Classificazione Status (specchio dello status nativo delle issue):
- **nativo** — esattamente le 7 opzioni native (Backlog, Todo, In progress, In review, Done, Not planned, Duplicate);
- **da migrare** — vecchie opzioni AGIC mappabili (es. Ready, Blocked, Removed, stati Scrum) → conforme con warning, da migrare;
- **non mappabile** — opzioni senza equivalente nativo → gli script non le interpretano;
- **incompleto** — solo nomi nativi ma non tutti (es. Status di default di GitHub) → da allineare.

Verdetto: ✅ conforme · ⚠️ conforme con warning · ❌ non conforme.

| # | Progetto | Metodo | Verdetto | Status | Campi mancanti | Opzioni Status mancanti | Viste mancanti |
|---|----------|--------|:--------:|--------|----------------|-------------------------|----------------|
| 1 | @KeyserDSoze's untitled project | kanban | ❌ | incompleto | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, In review, Not planned, Duplicate | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 4 | @lorenzotestiagic's untitled project | kanban | ❌ | incompleto | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, In review, Not planned, Duplicate | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 5 | @marziamariottoagic_testScrum | kanban | ❌ | incompleto | Severity, Effort level, 🚨 Alert, Target date | Backlog, In review, Not planned, Duplicate | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 15 | @giuseppemontanaroagic's untitled project | kanban | ❌ | incompleto | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, In review, Not planned, Duplicate | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 17 | @danieleincalzaagic's untitled project | kanban | ❌ | incompleto | Priority, Severity, Effort level, 🚨 Alert, Target date | Backlog, In review, Not planned, Duplicate | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 19 | ferroli/hydra | kanban | ❌ | nativo | Target date | — | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 20 | ucan/servizi_al_cittadino | scrum | ❌ | nativo | Target date | — | Backlog, Sprint backlog, Sprint board, Sprint breakdown, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 42 | IP.agic_bob | kanban | ❌ | nativo | Priority, Severity, Effort level, 🚨 Alert, Target date | — | Backlog, Board, Roadmap, Bug tracking, Impediment tracking, Alert attivi |
| 10 | GitHub Adoption | kanban | ✅ | nativo | — | — | — |
| 13 | Isokinetic Implementation | kanban | ✅ | nativo | — | — | — |
| 18 | isok-bcproject | kanban | ✅ | nativo | — | — | — |
| 21 | ce-demo/esa_germany | scrum | ⚠️ | da migrare | — | Backlog, Todo, In review, Not planned, Duplicate | — |
| 23 | alperia-lava | kanban | ✅ | nativo | — | — | — |
| 24 | ferroli-hydra | kanban | ✅ | nativo | — | — | — |
| 25 | isoki-bc_customization | kanban | ✅ | nativo | — | — | — |
| 26 | ucan-servizi_al_cittadino | scrum | ✅ | nativo | — | — | — |
| 28 | ce-demo/acquedotto_lucano | scrum | ✅ | nativo | — | — | — |
| 29 | Agic-chiomenti-github | kanban | ✅ | nativo | — | — | — |
| 30 | chiome-legal_pricing_assistant | kanban | ✅ | nativo | — | — | — |
| 31 | dedagroup-agent_data_platform | kanban | ✅ | nativo | — | — | — |
| 32 | bricofer-startrade | kanban | ✅ | nativo | — | — | — |
| 33 | enpav-sirena | kanban | ✅ | nativo | — | — | — |
| 34 | ce-demo/universita_bicocca | scrum | ✅ | nativo | — | — | — |
| 36 | stevanato-myspace3_0 | kanban | ✅ | nativo | — | — | — |
| 38 | Internal.bc_workflow | kanban | ✅ | nativo | — | — | — |
| 39 | iccrom-website | kanban | ✅ | nativo | — | — | — |
| 40 | Internal.fabric-agentic-template | kanban | ✅ | nativo | — | — | — |
| 41 | safety21-contact_center | kanban | ✅ | nativo | — | — | — |
| 43 | bolton-bc_customization | kanban | ✅ | nativo | — | — | — |
| 44 | Internal.fabric-agentic-cicd-plugin | kanban | ✅ | nativo | — | — | — |
| 45 | novomatic-bc_customization | kanban | ✅ | nativo | — | — | — |
| 46 | chiome-legal_pricing_assistant-fabric | kanban | ✅ | nativo | — | — | — |
| 47 | IP.presale_agent | scrum | ✅ | nativo | — | — | — |
| 48 | oberalp-bc_customization | kanban | ✅ | nativo | — | — | — |
| 49 | Internal.delivery_manager | kanban | ✅ | nativo | — | — | — |
| 50 | Internal.edge_lens | kanban | ✅ | nativo | — | — | — |
| 52 | IP.timevision | scrum | ✅ | nativo | — | — | — |
| 55 | faac-demo_field_service | scrum | ✅ | nativo | — | — | — |
| 56 | ce-demo/gruppo_ristorfoods | scrum | ✅ | nativo | — | — | — |
| 57 | faac-demo_contact_center | scrum | ✅ | nativo | — | — | — |

## ❌ Non conformi — azione consigliata
- **#1 @KeyserDSoze's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; opzioni Status native mancanti: Backlog, In review, Not planned, Duplicate. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#4 @lorenzotestiagic's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; opzioni Status native mancanti: Backlog, In review, Not planned, Duplicate. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#5 @marziamariottoagic_testScrum** — campi mancanti: Severity, Effort level, 🚨 Alert, Target date; opzioni Status native mancanti: Backlog, In review, Not planned, Duplicate. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#15 @giuseppemontanaroagic's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; opzioni Status native mancanti: Backlog, In review, Not planned, Duplicate. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#17 @danieleincalzaagic's untitled project** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date; opzioni Status native mancanti: Backlog, In review, Not planned, Duplicate. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#19 ferroli/hydra** — campi mancanti: Target date. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#20 ucan/servizi_al_cittadino** — campi mancanti: Target date. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).
- **#42 IP.agic_bob** — campi mancanti: Priority, Severity, Effort level, 🚨 Alert, Target date. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).

## ⚠️ Conformi con warning
- **#21 ce-demo/esa_germany** — Status da migrare allo status nativo (opzioni: New, In analysis, Ready to work, Approved, To Do, Ready for qa, Validated by QA, Removed).
