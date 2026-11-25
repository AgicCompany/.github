#!/usr/bin/env node
// @ts-nocheck
/*
 * migrate-native-status.mjs
 * Migra UN progetto dal vecchio campo "Status" del board allo status nativo delle issue
 * (public preview). Il campo Status del board resta come specchio con i 7 nomi nativi.
 *
 *   PROJECT_OWNER=AgicCompany node scripts/migrate-native-status.mjs --project 52            # dry-run
 *   PROJECT_OWNER=AgicCompany node scripts/migrate-native-status.mjs --project 52 --apply    # scrive
 *   aggiungi --allow-close per consentire la chiusura di issue aperte (board Done/Removed)
 *
 * Fasi (solo con --apply):
 *   0. snapshot JSON del progetto in ./migration-snapshots (backup per il rollback)
 *   1. status nativo delle issue dal valore del board (vecchi nomi -> lib/status.mjs) + label "blocked"
 *   2. opzioni del campo Status sostituite dai 7 nomi nativi con i colori standard (lib/status.mjs),
 *      riusando gli ID esistenti (i valori restano); su un progetto gia migrato aggiorna solo i colori
 *   3. campo Status del board riallineato allo status nativo di ogni issue (e ai nomi nativi per i draft)
 *
 * Regole di sicurezza:
 *   - un'issue chiusa non viene mai riaperta e il motivo di chiusura non cambia;
 *   - un'issue aperta viene chiusa (Done/Not planned) solo con --allow-close;
 *   - issue con valori in conflitto su altri board: saltate e segnalate;
 *   - item saltati che usano un'opzione da eliminare: stop prima di qualsiasi scrittura.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gql, fail, OWNER } from './lib/projects.mjs';
import {
  NATIVE_STATUSES, NATIVE_STATUS_COLORS, BLOCKED_LABEL, nativeFromLegacy, isNativeMirror, categoryOfName, isClosedCategory,
} from './lib/status.mjs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ALLOW_CLOSE = args.includes('--allow-close');
const PROJECT = parseInt(args[args.indexOf('--project') + 1], 10);
if (!PROJECT) fail('Indica il progetto: --project <numero>');

const ITEM_Q = `query($o:String!,$n:Int!,$c:String){ organization(login:$o){ projectV2(number:$n){
  id title field(name:"Status"){ ... on ProjectV2SingleSelectField{ id options{ id name color description } } }
  items(first:50, after:$c){ pageInfo{ hasNextPage endCursor } nodes{ id type
    fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue{ name optionId } }
    content{ __typename
      ... on Issue{ id number state stateReason url duplicateOf{ id }
        repository{ id nameWithOwner } labels(first:50){ nodes{ name } }
        status{ id name category{ key } }
        projectItems(first:50){ totalCount nodes{ project{ id }
          fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue{ name } } } } }
      ... on DraftIssue{ title } } } } } } }`;

async function loadProject() {
  let cursor = null, project = null;
  const items = [];
  do {
    const p = (await gqlRetry(ITEM_Q, { o: OWNER, n: PROJECT, c: cursor })).organization.projectV2;
    if (!p) fail(`Progetto #${PROJECT} non trovato in ${OWNER}`);
    if (!p.field) fail(`Il progetto #${PROJECT} non ha un campo Status single-select`);
    project = p;
    items.push(...p.items.nodes);
    cursor = p.items.pageInfo.hasNextPage ? p.items.pageInfo.endCursor : null;
  } while (cursor);
  return { id: project.id, title: project.title, field: project.field, items };
}

async function nativeIds(repoOwnerName) {
  const [owner, name] = repoOwnerName.split('/');
  const d = await gqlRetry(`query($o:String!,$r:String!){ repository(owner:$o,name:$r){ planningStatuses(first:20){ nodes{ id name } } } }`, { o: owner, r: name });
  const map = {};
  for (const s of d.repository?.planningStatuses?.nodes || []) map[s.name.toLowerCase()] = s.id;
  for (const s of NATIVE_STATUSES) if (!map[s.toLowerCase()]) fail(`Status nativo "${s}" non disponibile in ${repoOwnerName}`);
  return map;
}

const closedTarget = reason => reason === 'NOT_PLANNED' ? 'Not planned' : reason === 'DUPLICATE' ? 'Duplicate' : 'Done';

// Altri board dell'issue con un valore diverso dal target: scrivere lo status nativo li cambierebbe.
function boardConflict(projectItems, projectId, target) {
  if (projectItems.totalCount > projectItems.nodes.length) return 'issue su troppi board: verificare a mano';
  const bad = projectItems.nodes
    .filter(n => n.project.id !== projectId && n.fieldValueByName?.name)
    .map(n => n.fieldValueByName.name)
    .filter(v => (nativeFromLegacy(v) || '').toLowerCase() !== target.toLowerCase());
  return bad.length ? `conflitto con altri board: ${bad.join(', ')}` : null;
}

// Decide lo status nativo da impostare per un'issue. Ritorna { target, action, note }.
// Issue chiusa: vale sempre il motivo di chiusura (mai riaperta, motivo mai cambiato).
function planIssue(item, projectId) {
  const c = item.content;
  const board = item.fieldValueByName?.name ?? null;
  const native = c.status?.name ?? null;
  const closed = c.state === 'CLOSED';
  if (board && !nativeFromLegacy(board)) return { action: 'skip', note: `valore board non mappabile: ${board}` };
  const target = closed ? closedTarget(c.stateReason) : (board ? nativeFromLegacy(board) : (native ?? 'Backlog'));
  if (native && native.toLowerCase() === target.toLowerCase()) return { action: 'keep', target };
  const conflict = boardConflict(c.projectItems, projectId, target);
  if (conflict) return { action: 'skip', target, note: conflict };
  const closes = !closed && isClosedCategory(categoryOfName(target));
  if (closes && !ALLOW_CLOSE) return { action: 'skip', target, note: `chiuderebbe l'issue (${target}): serve --allow-close` };
  if (target === 'Duplicate' && !c.duplicateOf) return { action: 'skip', target, note: 'Duplicate senza issue originale' };
  return { action: 'set', target, note: closes ? 'CHIUDE l\'issue' : '' };
}

// Associa ogni nome nativo a un'opzione esistente (stesso nome, poi vecchio nome equivalente) per riusarne l'ID.
function planOptions(options) {
  const used = new Set();
  const pick = test => options.find(o => !used.has(o.id) && test(o));
  return NATIVE_STATUSES.map(name => {
    const lower = name.toLowerCase();
    const o = pick(x => x.name.toLowerCase() === lower) || pick(x => (nativeFromLegacy(x.name) || '').toLowerCase() === lower);
    if (o) used.add(o.id);
    return { id: o?.id, name, color: NATIVE_STATUS_COLORS[name], description: o?.description || '' };
  });
}

function report(project, plans, optionPlan, drafts) {
  const count = a => plans.filter(p => p.plan.action === a).length;
  console.log(`\n#${PROJECT} ${project.title} — ${project.items.length} item (${plans.length} issue, ${drafts.length} draft/PR)`);
  console.log(`Status nativo: ${count('set')} da impostare, ${count('keep')} invariati, ${count('skip')} saltati`);
  for (const p of plans.filter(x => x.plan.action !== 'keep')) {
    console.log(`  [${p.plan.action}] ${p.ref} board=${p.board ?? '-'} nativo=${p.native ?? '-'} -> ${p.plan.target ?? '-'} ${p.plan.note || ''}`);
  }
  const blocked = plans.filter(p => p.addBlocked);
  if (blocked.length) console.log(`Label "${BLOCKED_LABEL}" da aggiungere: ${blocked.map(p => p.ref).join(', ')}`);
  console.log('Opzioni del campo Status (nuovo [colore] <- vecchio [colore]):');
  for (const o of optionPlan) {
    const old = project.field.options.find(x => x.id === o.id);
    console.log(`  ${o.name} [${o.color}] <- ${old ? `${old.name} [${old.color}]` : '(nuova)'}`);
  }
  const dropped = project.field.options.filter(o => !optionPlan.some(n => n.id === o.id));
  if (dropped.length) console.log(`  opzioni rimosse: ${dropped.map(o => o.name).join(', ')} (i valori vengono riassegnati in fase 3)`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Ritenta solo errori transitori (rete, 5xx, HTML, limiti di frequenza). Da usare solo per letture e
// mutation idempotenti (stesso risultato se ripetute): setIssueStatus, addLabels, valore di un campo.
async function gqlRetry(query, vars) {
  for (let attempt = 1; ; attempt++) {
    try { return await gql(query, vars); } catch (e) {
      const msg = String(e.message || e);
      const limited = /rate limit|RATE_LIMITED|HTTP 429/i.test(msg);
      if (attempt > 3 || !(limited || /HTTP 5\d\d|non JSON|fetch failed|ECONNRESET|ETIMEDOUT|Something went wrong/i.test(msg))) throw e;
      await sleep(limited ? 60000 : 2000 * 2 ** attempt);
    }
  }
}

async function findLabel(owner, name) {
  const d = await gqlRetry(`query($o:String!,$r:String!,$l:String!){ repository(owner:$o,name:$r){ id label(name:$l){ id } } }`, { o: owner, r: name, l: BLOCKED_LABEL });
  return { repoId: d.repository.id, labelId: d.repository.label?.id ?? null };
}

// createLabel non e' idempotente: niente retry cieco, in caso di errore si verifica se la label esiste gia.
async function ensureLabel(repo) {
  const [owner, name] = repo.split('/');
  const found = await findLabel(owner, name);
  if (found.labelId) return found.labelId;
  try {
    const m = await gql(`mutation($r:ID!,$n:String!){ createLabel(input:{repositoryId:$r,name:$n,color:"b60205",description:"Item bloccato da un ostacolo"}){ label{ id } } }`,
      { r: found.repoId, n: BLOCKED_LABEL });
    return m.createLabel.label.id;
  } catch (e) {
    await sleep(5000);
    const again = await findLabel(owner, name);
    if (again.labelId) return again.labelId;
    throw e;
  }
}

// Esegue fn su ogni elemento. Un errore su un item non ferma gli altri: viene raccolto in failures.
async function eachSafe(list, failures, label, fn) {
  for (const x of list) {
    try { await fn(x); } catch (e) { failures.push(`${label(x)}: ${e.message || e}`); }
  }
}

// Pausa di 1 s dopo ogni scrittura (raccomandazione GitHub per le mutation in serie).
async function write(query, vars) {
  const d = await gqlRetry(query, vars);
  await sleep(1000);
  return d;
}

async function applyNative(plans, failures) {
  const idsByRepo = {}, labelByRepo = {};
  await eachSafe(plans, failures, p => p.ref, async p => {
    const repo = p.item.content.repository.nameWithOwner;
    if (p.plan.action === 'set') {
      idsByRepo[repo] ||= await nativeIds(repo);
      const vars = { i: p.item.content.id, s: idsByRepo[repo][p.plan.target.toLowerCase()], d: p.item.content.duplicateOf?.id ?? null };
      await write(`mutation($i:ID!,$s:ID!,$d:ID){ setIssueStatus(input:{issueId:$i,statusId:$s,duplicateIssueId:$d}){ clientMutationId } }`, vars);
    }
    if (p.addBlocked) {
      labelByRepo[repo] ||= await ensureLabel(repo);
      await write(`mutation($i:ID!,$l:[ID!]!){ addLabelsToLabelable(input:{labelableId:$i,labelIds:$l}){ clientMutationId } }`,
        { i: p.item.content.id, l: [labelByRepo[repo]] });
    }
  });
}

// updateProjectV2Field sostituisce l'elenco delle opzioni: ripeterla alla cieca potrebbe duplicare le
// opzioni nuove. In caso di errore si rilegge il campo: se e' gia lo specchio nativo, va bene cosi.
async function applyOptions(field, optionPlan) {
  const opts = optionPlan.map(o => ({ ...(o.id ? { id: o.id } : {}), name: o.name, color: o.color, description: o.description }));
  try {
    await gql(`mutation($f:ID!,$o:[ProjectV2SingleSelectFieldOptionInput!]){ updateProjectV2Field(input:{fieldId:$f,singleSelectOptions:$o}){
      projectV2Field{ ... on ProjectV2SingleSelectField{ id } } } }`, { f: field.id, o: opts });
  } catch (e) {
    await sleep(10000);
    const fresh = await loadProject();
    if (!isNativeMirror(fresh.field.options.map(o => o.name))) throw e;
  }
}

// Riallinea il board: issue -> status nativo attuale; draft -> nome nativo del vecchio valore.
// Le issue saltate in fase 1 restano con il loro valore (rinominato in fase 2) per la revisione manuale.
async function alignBoard(project, oldValues, skippedItemIds, failures) {
  const fresh = await loadProject();
  const optionByName = Object.fromEntries(fresh.field.options.map(o => [o.name.toLowerCase(), o.id]));
  const todo = fresh.items.map(it => ({
    it, want: it.content?.__typename === 'Issue' ? it.content.status?.name : nativeFromLegacy(oldValues[it.id]),
  })).filter(({ it, want }) => !skippedItemIds.has(it.id) && want
    && (it.fieldValueByName?.name || '').toLowerCase() !== want.toLowerCase());
  await eachSafe(todo, failures, x => x.it.content?.number ? `#${x.it.content.number}` : `item ${x.it.id}`, ({ it, want }) =>
    write(`mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){ updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){ clientMutationId } }`,
      { p: project.id, i: it.id, f: fresh.field.id, o: optionByName[want.toLowerCase()] }));
  return todo.length;
}

function buildPlans(project) {
  return project.items.filter(i => i.content?.__typename === 'Issue').map(item => {
    const board = item.fieldValueByName?.name ?? null;
    const labels = item.content.labels.nodes.map(l => l.name.toLowerCase());
    const plan = planIssue(item, project.id);
    return {
      item, board, plan, native: item.content.status?.name ?? null,
      ref: `${item.content.repository.nameWithOwner}#${item.content.number}`,
      addBlocked: plan.action !== 'skip' && board?.toLowerCase() === 'blocked' && !labels.includes(BLOCKED_LABEL),
    };
  });
}

// Item saltati il cui valore sul board usa un'opzione che la fase 2 eliminerebbe: il valore andrebbe perso.
function blockersFor(plans, optionPlan) {
  const kept = new Set(optionPlan.map(o => o.id).filter(Boolean));
  return plans.filter(p => p.plan.action === 'skip' && p.item.fieldValueByName?.optionId && !kept.has(p.item.fieldValueByName.optionId));
}

(async () => {
  const project = await loadProject();
  const drafts = project.items.filter(i => i.content?.__typename !== 'Issue');
  const plans = buildPlans(project);
  const optionPlan = planOptions(project.field.options);
  report(project, plans, optionPlan, drafts);
  const blockers = blockersFor(plans, optionPlan);
  if (blockers.length) {
    console.log(`\nSTOP: ${blockers.length} item saltati usano opzioni che verrebbero eliminate (${blockers.map(p => `${p.ref}=${p.board}`).join(', ')}).`);
    console.log('Risolvere a mano questi item (es. cambiare il valore sul board o il conflitto) e rilanciare.');
    if (APPLY) process.exitCode = 1;
    return;
  }
  const upToDate = project.field.options.length === NATIVE_STATUSES.length
    && project.field.options.every(o => NATIVE_STATUS_COLORS[o.name] === o.color);
  if (!APPLY) { console.log('\n[DRY-RUN] Nessuna scrittura. Rilancia con --apply per eseguire.'); return; }

  mkdirSync('migration-snapshots', { recursive: true });
  const file = `migration-snapshots/project-${PROJECT}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify(project, null, 1));
  console.log(`\nSnapshot salvato: ${file} (conservarlo: serve per il ripristino)`);

  const failures = [];
  await applyNative(plans.filter(p => p.plan.action === 'set' || p.addBlocked), failures);
  if (failures.length) {
    console.log(`\nSTOP dopo la fase 1: errori su ${failures.length} issue. Il board non e' stato modificato.\n  ${failures.join('\n  ')}`);
    console.log('Rilanciare lo script: le issue gia aggiornate risultano invariate.');
    process.exitCode = 1;
    return;
  }
  console.log('Fase 1 completata: status nativo e label.');
  if (!upToDate) await applyOptions(project.field, optionPlan);
  console.log('Fase 2 completata: opzioni del campo Status.');
  await new Promise(r => setTimeout(r, 10000)); // attesa della sincronizzazione board <-> nativo
  const oldValues = Object.fromEntries(project.items.map(i => [i.id, i.fieldValueByName?.name ?? null]));
  const skipped = new Set(plans.filter(p => p.plan.action === 'skip').map(p => p.item.id));
  console.log(`Fase 3 completata: ${await alignBoard(project, oldValues, skipped, failures)} valori del board da riallineare.`);
  if (skipped.size) console.log(`Item saltati e non modificati sul board: ${skipped.size} (vedi elenco [skip] sopra).`);
  if (failures.length) {
    console.log(`\nERRORI su ${failures.length} item (valori originali nello snapshot ${file}):\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
})().catch(e => fail(`${e.message || e}\nSe la migrazione si e' interrotta, i valori originali sono nello snapshot in migration-snapshots/.`));
