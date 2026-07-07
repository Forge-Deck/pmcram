/**
 * Curate the guide `topics` (the Guides-page filter tags): normalise casing +
 * known synonyms against the canonical vocabulary, dedupe, and print the tag
 * vocabulary with counts. Unknown topics are kept (they surface as new chips)
 * but flagged so the vocabulary can be extended deliberately.
 *
 *   node scripts/curate-guide-topics.mjs          # normalise in place + report
 *   node scripts/curate-guide-topics.mjs --check   # report only, non-zero on drift
 *
 * Intended to run on push (alongside manifest regeneration).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', 'content', 'guides');
const check = process.argv.includes('--check');

/** Canonical top-level topics. Extend this list to add a new chip vocabulary. */
const CANON = [
  'Exam Strategy',
  'PMBOK 8',
  'Mindset',
  'Process',
  'Agile',
  'Hybrid',
  'Predictive',
  'Formulae',
  'Charts',
  'Risk',
  'Governance',
  'Emerging Trends',
];

// lower-cased -> canonical, including a few synonyms.
const NORM = new Map(CANON.map((t) => [t.toLowerCase(), t]));
for (const [k, v] of [
  ['formulas', 'Formulae'],
  ['emerging trends', 'Emerging Trends'],
  ['charts & diagrams', 'Charts'],
  ['pmbok8', 'PMBOK 8'],
  ['pmbok 8th edition', 'PMBOK 8'],
])
  NORM.set(k, v);

let changed = 0;
const counts = {};
const unknown = new Set();
const noTopics = [];

for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const fp = join(dir, f);
  const arr = JSON.parse(readFileSync(fp, 'utf8'));
  const g = arr[0];
  if (!Array.isArray(g.topics) || g.topics.length === 0) {
    noTopics.push(g.title);
    continue;
  }
  const seen = new Set();
  const out = [];
  for (const raw of g.topics) {
    const key = String(raw).trim().toLowerCase();
    const t = NORM.get(key) ?? String(raw).trim();
    if (!CANON.includes(t)) unknown.add(t);
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  if (JSON.stringify(out) !== JSON.stringify(g.topics)) {
    changed++;
    if (!check) {
      g.topics = out;
      writeFileSync(fp, JSON.stringify(arr, null, 2) + '\n');
    }
  }
  out.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
}

console.log('\nTopic vocabulary:');
for (const [t, n] of Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))
  console.log('  ' + String(n).padStart(3) + '  ' + t);
if (unknown.size) console.warn('\n! Off-vocabulary topics (kept, add to CANON if intended): ' + [...unknown].join(', '));
if (noTopics.length) console.warn('\n! Guides with no topics: ' + noTopics.join(', '));

console.log(`\n${check ? 'Would normalise' : 'Normalised'} ${changed} guide(s).`);
if (check && changed) process.exit(1);
