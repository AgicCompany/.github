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

const dryRun = process.argv.includes('--dry-run');
const MD_FILE = process.env.CONFORMANCE_MD || 'metrics/conformance.md';
const CSV_FILE = process.env.CONFORMANCE_CSV || 'metrics/conformance.csv';

// --- Standard atteso, derivato dai template #8/#9 ---
// Campi obbligatori su ogni progetto conforme (hard check).
const REQUIRED_FIELDS = ['Status', 'Priority', 'Severity', 'Effort level', '🚨 Alert', 'Target date'];
// Opzioni complete del campo Status (hard check).
const REQUIRED_STATUS_OPTIONS = ['Backlog', 'Ready', 'In Progress', 'In Review', 'Done', 'Blocked', 'Removed'];
// Set di default di GitHub per un Project mai configurato.
const GITHUB_DEFAULT_STATUS = ['Todo', 'In Progress', 'Done'];
// Viste attese per metodo (soft check: segnalate come warning, non rompono la conformita').
const EXPECTED_VIEWS = {
  scrum: ['Backlog', 'Sprint backlog', 'Sprint board', 'Sprint breakdown', 'Roadmap', 'Bug tracking', 'Impediment tracking', 'Alert attivi'],
  kanban: ['Backlog', 'Board', 'Roadmap', 'Bug tracking', 'Impediment tracking', 'Alert attivi'],
};

const HEADERS = [
  'snapshot_date', 'project_number', 'project_title', 'method',
  'conformant', 'status_kind', 'missing_fields', 'missing_status_options',
  'extra_status_options', 'missing_views',
];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

// Classifica il campo Status: standard completo, default GitHub mai configurato,
// standard incompleto (sottoinsieme dello standard) o workflow personalizzato dal cliente.
function classifyStatus(statusOpts, missingStatus, extraStatus) {
  if (missingStatus.length === 0) return 'standard';
  if (sameSet(statusOpts, GITHUB_DEFAULT_STATUS)) return 'default';
  if (extraStatus.length > 0) return 'personalizzato';
  return 'incompleto';
}

function evaluate(fields, views, method) {
  const missingFields = REQUIRED_FIELDS.filter(f => !fields[f]);
  const statusOpts = (fields['Status']?.options || []).map(o => o.name);
  const missingStatus = REQUIRED_STATUS_OPTIONS.filter(o => !statusOpts.includes(o));
  const extraStatus = statusOpts.filter(o => !REQUIRED_STATUS_OPTIONS.includes(o));
  const statusKind = classifyStatus(statusOpts, missingStatus, extraStatus);
  const viewNames = views.map(v => v.name);
  const missingViews = (EXPECTED_VIEWS[method] || []).filter(v => !viewNames.includes(v));
  // Campi = hard. Status: 'standard'/'personalizzato' passano; 'default'/'incompleto' bloccano.
  // Uno Status personalizzato e' un workflow cliente voluto -> conforme con warning, non gap.
  const statusOk = statusKind === 'standard' || statusKind === 'personalizzato';
  const conformant = missingFields.length === 0 && statusOk;
  const warnings = [];
  if (statusKind === 'personalizzato') warnings.push('Status personalizzato (workflow cliente)');
  if (missingViews.length) warnings.push(`viste mancanti: ${missingViews.join(', ')}`);
  return { missingFields, missingStatus, extraStatus, statusKind, missingViews, conformant, warnings };
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
  lines.push('La conformita\' "hard" richiede tutti i campi obbligatori e uno Status **standard** o **personalizzato**.');
  lines.push('');
  lines.push('Classificazione Status:');
  lines.push('- **standard** — le 7 opzioni standard presenti;');
  lines.push('- **personalizzato** — workflow del cliente diverso ma voluto → conforme, segnalato come warning;');
  lines.push('- **incompleto** — sottoinsieme dello standard con opzioni mancanti → gap da sanare;');
  lines.push('- **default** — Status di GitHub mai configurato (Todo/In Progress/Done) → progetto da allineare.');
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
      if (r.statusKind === 'default') reasons.push('Status di GitHub mai configurato (Todo/In Progress/Done)');
      else if (r.statusKind === 'incompleto') reasons.push(`opzioni Status mancanti: ${r.missingStatus.join(', ')}`);
      lines.push(`- **#${r.number} ${r.title}** — ${reasons.join('; ')}. Ricrearlo da template o allineare campi/Status.`);
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
    if (ev.statusKind === 'incompleto') console.log(`    opzioni Status mancanti: ${ev.missingStatus.join(', ')}`);
    if (ev.statusKind === 'personalizzato') console.log(`    Status personalizzato (workflow cliente): ${ev.extraStatus.join(', ')}`);
    if (ev.missingViews.length) console.log(`    viste mancanti (warning): ${ev.missingViews.join(', ')}`);
  }
  rows.sort((a, b) => (a.conformant === b.conformant) ? a.number - b.number : (a.conformant ? 1 : -1));

  const csvRows = rows.map(r => [
    snapshot, r.number, r.title, r.method, r.conformant ? 'yes' : 'no', r.statusKind,
    r.missingFields.join('|'), r.missingStatus.join('|'), r.extraStatus.join('|'), r.missingViews.join('|'),
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
