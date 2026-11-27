#!/usr/bin/env node
// @ts-nocheck
/*
 * project-conformance.mjs
 * Report READ-ONLY di conformita' dei progetti org-wide rispetto allo standard dei template
 * (#8 agic_scrum / #9 agic_kanban). Serve a individuare i progetti fuori standard (creati a mano,
 * non da template) prima che le automazioni li saltino in silenzio (es. campo Alert mancante).
 *
 * NON scrive nulla sui progetti: produce solo due artefatti nel repo .github:
 *   - metrics/conformance.md  (report leggibile)
 *   - metrics/conformance.csv (dati grezzi)
 *
 *   node project-conformance.mjs [--dry-run]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CONFIG, listProjects, getFields, getViews, projectMethod,
  isoDate, startOfTodayUTC, fail,
} from './lib/projects.mjs';
import { NATIVE_STATUSES, isNativeName, nativeFromLegacy } from './lib/status.mjs';

const dryRun = process.argv.includes('--dry-run');
const MD_FILE = process.env.CONFORMANCE_MD || 'metrics/conformance.md';
const CSV_FILE = process.env.CONFORMANCE_CSV || 'metrics/conformance.csv';

// --- Standard atteso, derivato dai template #8/#9 ---
// Campi obbligatori su ogni progetto conforme (hard check).
const REQUIRED_FIELDS = ['Status', 'Priority', 'Severity', 'Effort level', '🚨 Alert', 'Target date'];
// Campi di pianificazione che devono essere Issue Field di organizzazione (AgicCompany/github-adoption#44):
// se sul progetto sono ancora campi di progetto il report lo segnala come warning.
const ISSUE_FIELDS = ['Priority', 'Severity', 'Effort level', 'Start date', 'Target date'];
// Il campo Status e' lo specchio dello status nativo delle issue: deve avere esattamente i 7 nomi nativi.
// Viste attese per metodo (soft check: segnalate come warning, non rompono la conformita').
const EXPECTED_VIEWS = {
  scrum: ['Backlog', 'Sprint backlog', 'Sprint board', 'Sprint breakdown', 'Roadmap', 'Bug tracking', 'Impediment tracking', 'Alert attivi'],
  kanban: ['Backlog', 'Board', 'Roadmap', 'Bug tracking', 'Impediment tracking', 'Alert attivi'],
};

const HEADERS = [
  'snapshot_date', 'project_number', 'project_title', 'method',
  'conformant', 'status_kind', 'missing_fields', 'missing_status_options',
  'extra_status_options', 'missing_views', 'project_planning_fields',
];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Classifica il campo Status rispetto allo status nativo:
// - nativo: esattamente i 7 nomi nativi (maiuscole ignorate, come fa GitHub nella sincronizzazione);
// - da migrare: contiene vecchie opzioni AGIC mappabili (Ready, Blocked, Removed, stati Scrum) -> warning;
// - non mappabile: contiene opzioni senza equivalente nativo -> gli script non le interpretano;
// - incompleto: solo nomi nativi, ma non tutti.
function classifyStatus(missingStatus, extraStatus) {
  if (missingStatus.length === 0 && extraStatus.length === 0) return 'nativo';
  if (extraStatus.some(o => !nativeFromLegacy(o))) return 'non mappabile';
  if (extraStatus.length > 0) return 'da migrare';
  return 'incompleto';
}

function evaluate(fields, views, method) {
  const missingFields = REQUIRED_FIELDS.filter(f => !fields[f]);
  const statusOpts = (fields['Status']?.options || []).map(o => o.name);
  const lowerOpts = statusOpts.map(o => o.toLowerCase());
  const missingStatus = NATIVE_STATUSES.filter(o => !lowerOpts.includes(o.toLowerCase()));
  const extraStatus = statusOpts.filter(o => !isNativeName(o));
  const statusKind = classifyStatus(missingStatus, extraStatus);
  const viewNames = views.map(v => v.name);
  const missingViews = (EXPECTED_VIEWS[method] || []).filter(v => !viewNames.includes(v));
  const projectPlanningFields = ISSUE_FIELDS.filter(f => fields[f] && !fields[f].isIssueField);
  // Campi = hard. Status: 'nativo'/'da migrare' passano; 'non mappabile'/'incompleto' bloccano.
  const statusOk = statusKind === 'nativo' || statusKind === 'da migrare';
  const conformant = missingFields.length === 0 && statusOk;
  const warnings = [];
  if (statusKind === 'da migrare') warnings.push(`Status da migrare allo status nativo (opzioni: ${extraStatus.join(', ')})`);
  if (missingViews.length) warnings.push(`viste mancanti: ${missingViews.join(', ')}`);
  if (projectPlanningFields.length) warnings.push(`campi di progetto da sostituire con gli Issue Field: ${projectPlanningFields.join(', ')}`);
  return { missingFields, missingStatus, extraStatus, statusKind, missingViews, projectPlanningFields, conformant, warnings };
}

function buildMarkdown(rows, snapshot) {
  const nonConf = rows.filter(r => !r.conformant);
  const withWarnings = rows.filter(r => r.conformant && r.warnings.length > 0);
  const lines = [];
  lines.push('# Report di conformita\' progetti (org-wide)');
  lines.push('');
  lines.push(`_Read-only · agg. ${snapshot} · ${rows.length} progetti analizzati · ${nonConf.length} non conformi · ${withWarnings.length} con warning_`);
  lines.push('');
  lines.push('Standard di riferimento: template **#8 agic_scrum** / **#9 agic_kanban**.');
  lines.push('La conformita\' "hard" richiede tutti i campi obbligatori e uno Status **nativo** o **da migrare**.');
  lines.push('');
  lines.push('Classificazione Status (specchio dello status nativo delle issue):');
  lines.push('- **nativo** — esattamente le 7 opzioni native (Backlog, Todo, In progress, In review, Done, Not planned, Duplicate);');
  lines.push('- **da migrare** — vecchie opzioni AGIC mappabili (es. Ready, Blocked, Removed, stati Scrum) → conforme con warning, da migrare;');
  lines.push('- **non mappabile** — opzioni senza equivalente nativo → gli script non le interpretano;');
  lines.push('- **incompleto** — solo nomi nativi ma non tutti (es. Status di default di GitHub) → da allineare.');
  lines.push('');
  lines.push('Verdetto: ✅ conforme · ⚠️ conforme con warning · ❌ non conforme.');
  lines.push('');
  lines.push('| # | Progetto | Metodo | Verdetto | Status | Campi mancanti | Opzioni Status mancanti | Viste mancanti |');
  lines.push('|---|----------|--------|:--------:|--------|----------------|-------------------------|----------------|');
  for (const r of rows) {
    const verdict = !r.conformant ? '❌' : (r.warnings.length ? '⚠️' : '✅');
    lines.push(`| ${r.number} | ${r.title} | ${r.method} | ${verdict} | ${r.statusKind} | ${r.missingFields.join(', ') || '—'} | ${r.missingStatus.join(', ') || '—'} | ${r.missingViews.join(', ') || '—'} |`);
  }
  lines.push('');
  if (nonConf.length) {
    lines.push('## ❌ Non conformi — azione consigliata');
    for (const r of nonConf) {
      const reasons = [];
      if (r.missingFields.length) reasons.push(`campi mancanti: ${r.missingFields.join(', ')}`);
      if (r.statusKind === 'non mappabile') reasons.push(`opzioni Status senza equivalente nativo: ${r.extraStatus.filter(o => !nativeFromLegacy(o)).join(', ')}`);
      else if (r.statusKind === 'incompleto') reasons.push(`opzioni Status native mancanti: ${r.missingStatus.join(', ')}`);
      const also = r.projectPlanningFields.length ? ` Inoltre: campi di progetto da sostituire con gli Issue Field: ${r.projectPlanningFields.join(', ')}.` : '';
      lines.push(`- **#${r.number} ${r.title}** — ${reasons.join('; ')}. Ricrearlo da template o migrare lo Status (scripts/migrate-native-status.mjs).${also}`);
    }
    lines.push('');
  }
  if (withWarnings.length) {
    lines.push('## ⚠️ Conformi con warning');
    for (const r of withWarnings) {
      lines.push(`- **#${r.number} ${r.title}** — ${r.warnings.join('; ')}.`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

(async () => {
  const snapshot = isoDate(startOfTodayUTC());
  const projects = await listProjects();
  console.log(`Trovati ${projects.length} project (esclusi template e chiusi). Analizzo la conformita'...\n`);

  const rows = [];
  for (const p of projects) {
    const fields = await getFields(p.id);
    const views = await getViews(p.id);
    const method = projectMethod(fields);
    const ev = evaluate(fields, views, method);
    rows.push({ number: p.number, title: p.title, method, ...ev });
    const flag = !ev.conformant ? 'NON CONFORME' : (ev.warnings.length ? 'WARNING' : 'OK ');
    console.log(`#${p.number} [${method}] ${flag} — ${p.title} (status: ${ev.statusKind})`);
    if (ev.missingFields.length) console.log(`    campi mancanti: ${ev.missingFields.join(', ')}`);
    if (ev.statusKind === 'incompleto') console.log(`    opzioni Status native mancanti: ${ev.missingStatus.join(', ')}`);
    if (ev.extraStatus.length) console.log(`    opzioni Status non native (${ev.statusKind}): ${ev.extraStatus.join(', ')}`);
    if (ev.missingViews.length) console.log(`    viste mancanti (warning): ${ev.missingViews.join(', ')}`);
    if (ev.projectPlanningFields.length) console.log(`    campi di progetto da sostituire con gli Issue Field (warning): ${ev.projectPlanningFields.join(', ')}`);
  }
  rows.sort((a, b) => (a.conformant === b.conformant) ? a.number - b.number : (a.conformant ? 1 : -1));

  const csvRows = rows.map(r => [
    snapshot, r.number, r.title, r.method, r.conformant ? 'yes' : 'no', r.statusKind,
    r.missingFields.join('|'), r.missingStatus.join('|'), r.extraStatus.join('|'), r.missingViews.join('|'),
    r.projectPlanningFields.join('|'),
  ]);
  const csv = [HEADERS, ...csvRows].map(r => r.map(csvCell).join(',')).join('\n') + '\n';
  const md = buildMarkdown(rows, snapshot);

  const nonConf = rows.filter(r => !r.conformant).length;
  const warn = rows.filter(r => r.conformant && r.warnings.length).length;
  if (dryRun) {
    console.log(`\n[DRY-RUN] ${CSV_FILE}: ${csvRows.length} righe. ${MD_FILE}: report markdown. Anteprima CSV:\n`);
    console.log(csv.split('\n').slice(0, 6).join('\n'));
  } else {
    for (const file of [MD_FILE, CSV_FILE]) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(CSV_FILE, csv, 'utf8');
    writeFileSync(MD_FILE, md, 'utf8');
    console.log(`\nScritti ${MD_FILE} e ${CSV_FILE}.`);
  }
  console.log(`\n${rows.length} progetti analizzati, ${nonConf} non conformi, ${warn} con warning.${dryRun ? ' [DRY-RUN]' : ''}`);
})().catch(e => fail(e.message || e));
