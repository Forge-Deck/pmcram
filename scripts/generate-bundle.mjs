/**
 * Regenerate content/bundle.json — a single file containing ALL content records
 * grouped by type. The app fetches this in ONE request instead of ~80 per-file
 * requests, which is what tripped raw.githubusercontent throttling (HTTP 429).
 * Per-file sync remains as a fallback. Run by CI on merge to main alongside the
 * manifest; contributors do NOT edit this by hand.
 *
 *   node scripts/generate-bundle.mjs
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const contentDir = join(root, 'content');

// dir -> ContentType key used by the app
const TARGETS = [
  { dir: 'glossary', type: 'glossary' },
  { dir: 'questions', type: 'question' },
  { dir: 'decks', type: 'card' },
  { dir: 'guides', type: 'guide' },
  { dir: 'sequences', type: 'sequence' },
  { dir: 'cases', type: 'case' },
  { dir: 'pointclick', type: 'pointclick' },
  { dir: 'figuregen', type: 'figuregen' },
];

const data = { glossary: [], question: [], card: [], guide: [], sequence: [], case: [], pointclick: [], figuregen: [] };

for (const { dir, type } of TARGETS) {
  const full = join(contentDir, dir);
  if (!existsSync(full)) continue;
  for (const name of readdirSync(full).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const arr = JSON.parse(readFileSync(join(full, name), 'utf8'));
      if (Array.isArray(arr)) data[type].push(...arr);
    } catch {
      // skip unreadable file; validate.mjs guards content quality separately
    }
  }
}

const bundle = {
  bundleVersion: 1,
  generatedAt: new Date().toISOString(),
  totals: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
  data,
};

writeFileSync(join(contentDir, 'bundle.json'), JSON.stringify(bundle));
const t = bundle.totals;
console.log(
  `✓ Wrote content/bundle.json — ${t.glossary} terms / ${t.question} questions / ${t.card} cards / ${t.guide} guides / ${t.sequence} sequences / ${t.case} cases / ${t.figuregen} figuregen / ${t.pointclick} pointclick.`,
);
