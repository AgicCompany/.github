#!/usr/bin/env node
// @ts-nocheck
/*
 * changelog-watch.mjs
 * Legge il feed del GitHub Changelog e apre un'issue in questa repo per ogni annuncio nuovo che
 * riguarda lo status nativo delle issue (public preview dal 23/11/2026), cosi chi e' assegnato
 * riceve una notifica GitHub. Un annuncio genera una sola issue (dedup sul link).
 *
 *   node scripts/changelog-watch.mjs [--dry-run]
 *
 * Env: GITHUB_TOKEN (issues: write), GITHUB_REPOSITORY (owner/repo),
 *      NOTIFY_USERS (login separati da virgola), CUTOFF (data ISO: ignora annunci precedenti).
 */
const FEED = 'https://github.blog/changelog/feed/';
const LABEL = 'changelog-watch';
const KEYWORDS = /issue status|issue statuses|planning status|repository boards?|sync with issue status/i;

const dryRun = process.argv.includes('--dry-run');
const { GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: REPO } = process.env;
const NOTIFY = (process.env.NOTIFY_USERS || '').split(',').map(s => s.trim()).filter(Boolean);
const CUTOFF = new Date(process.env.CUTOFF || '1970-01-01');
if (!TOKEN || !REPO) { console.error('ERRORE: servono GITHUB_TOKEN e GITHUB_REPOSITORY'); process.exit(1); }

const decode = s => {
  const cdata = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  if (cdata) return cdata[1].trim();
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
};
const tag = (xml, name) => decode((xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`)) || [])[1] || '');
const normLink = l => l.trim().replace(/[)>.,]+$/, '').replace(/\/+$/, '');

async function api(path, init = {}, { allow422 = false } = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  });
  if (res.status === 422 && allow422) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

async function knownLinks() {
  const links = new Set();
  for (let page = 1; ; page++) {
    const issues = await api(`/issues?labels=${LABEL}&state=all&per_page=100&page=${page}`);
    for (const i of issues.filter(x => !x.pull_request)) {
      for (const m of (i.body || '').matchAll(/https:\/\/github\.blog\/changelog\/\S+/g)) links.add(normLink(m[0]));
    }
    if (issues.length < 100) return links;
  }
}

async function readFeed() {
  const res = await fetch(FEED);
  const xml = await res.text();
  if (!res.ok || !/<rss[\s>]/.test(xml)) throw new Error(`feed non valido (HTTP ${res.status})`);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => ({
    title: tag(m[1], 'title'), link: normLink(tag(m[1], 'link')), date: new Date(tag(m[1], 'pubDate')), text: m[1],
  }));
  if (!items.length || items.some(i => !i.link || Number.isNaN(i.date.getTime()))) throw new Error('feed senza annunci leggibili');
  return items;
}

(async () => {
  const items = await readFeed();
  const relevant = items.filter(i => i.date >= CUTOFF && KEYWORDS.test(`${i.title} ${i.text}`));
  console.log(`Feed: ${items.length} annunci, ${relevant.length} pertinenti dal ${CUTOFF.toISOString().slice(0, 10)}.`);
  if (!relevant.length) return;

  const known = await knownLinks();
  if (!dryRun) {
    // 422 = label gia esistente
    await api('/labels', { method: 'POST', body: JSON.stringify({ name: LABEL, color: '0e8a16', description: 'Annuncio GitHub Changelog da valutare' }) }, { allow422: true });
  }
  for (const i of relevant) {
    if (known.has(i.link)) { console.log(`gia segnalato: ${i.title}`); continue; }
    known.add(i.link);
    const body = [
      `Nuovo annuncio nel GitHub Changelog che riguarda lo **status nativo delle issue** (in uso nei Project AgicCompany).`,
      '', `- **Annuncio:** ${i.link}`, `- **Data:** ${i.date.toISOString().slice(0, 10)}`, '',
      'Da valutare: impatto su `scripts/lib/status.mjs`, `scripts/migrate-native-status.mjs`, guide 02/03/05 e template #8/#9.',
    ].join('\n');
    if (dryRun) { console.log(`[DRY-RUN] nuova issue: ${i.title}`); continue; }
    const created = await api('/issues', { method: 'POST', body: JSON.stringify({ title: `[GitHub Changelog] ${i.title}`, body, labels: [LABEL], assignees: NOTIFY }) });
    const assigned = (created.assignees || []).map(a => a.login);
    console.log(`creata issue #${created.number}: ${i.title} (assegnata a: ${assigned.join(', ') || 'nessuno'})`);
    const missing = NOTIFY.filter(u => !assigned.includes(u));
    if (missing.length) { console.error(`ERRORE: assegnazione non riuscita per ${missing.join(', ')}`); process.exitCode = 1; }
  }
})().catch(e => { console.error('ERRORE: ' + (e.message || e)); process.exit(1); });
