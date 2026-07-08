/**
 * Regenerate content/bundle.json — every content file's records in ONE file, so
 * the app can do a full sync in a single request instead of ~80 (which tripped
 * raw.githubusercontent throttling, HTTP 429).
 *
 * Structured PER FILE ({ path, type, sha256, records }) — same shape the app
 * caches — so after a bundle sync the app knows each file's sha and can then
 * fetch ONLY the files that changed on later syncs (small edits → small syncs).
 * The sha256 is of the raw file bytes, matching the manifest.
 *
 *   node scripts/generate-bundle.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const contentDir = join(root, 'content');

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

const files = [];
const totals = {};

for (const { dir, type } of TARGETS) {
  const full = join(contentDir, dir);
  if (!existsSync(full)) continue;
  for (const name of readdirSync(full).filter((f) => f.endsWith('.json')).sort()) {
    const bytes = readFileSync(join(full, name));
    let records = [];
    try {
      const arr = JSON.parse(bytes.toString('utf8'));
      if (Array.isArray(arr)) records = arr;
    } catch {
      continue;
    }
    files.push({
      path: `content/${dir}/${name}`,
      type,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      records,
    });
    totals[type] = (totals[type] || 0) + records.length;
  }
}

const bundle = { bundleVersion: 2, generatedAt: new Date().toISOString(), totals, files };
writeFileSync(join(contentDir, 'bundle.json'), JSON.stringify(bundle));
const t = totals;
console.log(
  `✓ Wrote content/bundle.json — ${files.length} files: ${t.glossary || 0} terms / ${t.question || 0} questions / ${t.card || 0} cards / ${t.guide || 0} guides / ${t.sequence || 0} sequences / ${t.case || 0} cases / ${t.figuregen || 0} figuregen.`,
);
