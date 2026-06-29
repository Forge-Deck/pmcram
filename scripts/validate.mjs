/**
 * Validate every content file against its JSON Schema, plus a few cross-field
 * checks the schema can't express. Run by CI on every PR and push.
 *
 *   node scripts/validate.mjs
 *
 * Exits non-zero (and prints offending file + errors) if anything fails.
 */

import Ajv from 'ajv';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const contentDir = join(root, 'content');
const schemaDir = join(contentDir, 'schema');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const validators = {
  glossary: ajv.compile(readJson(join(schemaDir, 'glossary.schema.json'))),
  question: ajv.compile(readJson(join(schemaDir, 'question.schema.json'))),
  card: ajv.compile(readJson(join(schemaDir, 'deck.schema.json'))),
  guide: ajv.compile(readJson(join(schemaDir, 'guide.schema.json'))),
  sequence: ajv.compile(readJson(join(schemaDir, 'sequence.schema.json'))),
  case: ajv.compile(readJson(join(schemaDir, 'case.schema.json'))),
  pointclick: ajv.compile(readJson(join(schemaDir, 'pointclick.schema.json'))),
  figuregen: ajv.compile(readJson(join(schemaDir, 'figuregen.schema.json'))),
};

/** folder → record type */
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

const errors = [];

/** Cross-field checks for questions (counts must be internally consistent). */
function checkQuestion(rec, file, i) {
  const where = `${file} [${i}] (${rec.id ?? 'no id'})`;
  if (Array.isArray(rec.correct) && typeof rec.select === 'number' && rec.correct.length !== rec.select) {
    errors.push(`${where}: select (${rec.select}) must equal correct.length (${rec.correct.length}).`);
  }
  if (typeof rec.present === 'number' && typeof rec.select === 'number' && rec.present <= rec.select) {
    errors.push(`${where}: present (${rec.present}) must be greater than select (${rec.select}).`);
  }
  const pool = (rec.correct?.length ?? 0) + (rec.distractors?.length ?? 0);
  if (typeof rec.present === 'number' && rec.present > pool) {
    errors.push(`${where}: present (${rec.present}) exceeds correct + distractors (${pool}).`);
  }
}

/** Same count checks for a case step (a mini-question). */
function checkCaseStep(step, file, where) {
  if (Array.isArray(step.correct) && typeof step.select === 'number' && step.correct.length !== step.select) {
    errors.push(`${file} ${where}: select (${step.select}) must equal correct.length (${step.correct.length}).`);
  }
  if (typeof step.present === 'number' && typeof step.select === 'number' && step.present <= step.select) {
    errors.push(`${file} ${where}: present (${step.present}) must be greater than select (${step.select}).`);
  }
  const pool = (step.correct?.length ?? 0) + (step.distractors?.length ?? 0);
  if (typeof step.present === 'number' && step.present > pool) {
    errors.push(`${file} ${where}: present (${step.present}) exceeds correct + distractors (${pool}).`);
  }
}

// Duplicate-key detection across the whole repo.
const seenIds = new Map();
const seenTerms = new Map();
const seenTitles = new Map();

let fileCount = 0;
let recordCount = 0;

for (const { dir, type } of TARGETS) {
  const full = join(contentDir, dir);
  if (!existsSync(full)) continue;
  const files = readdirSync(full).filter((f) => f.endsWith('.json'));
  const validate = validators[type];

  for (const name of files) {
    const file = `content/${dir}/${name}`;
    fileCount += 1;
    let data;
    try {
      data = readJson(join(full, name));
    } catch (e) {
      errors.push(`${file}: invalid JSON — ${e.message}`);
      continue;
    }
    if (!Array.isArray(data)) {
      errors.push(`${file}: top level must be a JSON array of records.`);
      continue;
    }
    data.forEach((rec, i) => {
      recordCount += 1;
      if (!validate(rec)) {
        for (const err of validate.errors ?? []) {
          errors.push(`${file} [${i}] ${err.instancePath || '/'} ${err.message}`);
        }
      }
      if (type === 'question') {
        checkQuestion(rec, file, i);
        if (rec.id) {
          if (seenIds.has(rec.id)) errors.push(`${file} [${i}]: duplicate id "${rec.id}" (also in ${seenIds.get(rec.id)}).`);
          else seenIds.set(rec.id, file);
        }
      } else if (type === 'card' && rec.id) {
        if (seenIds.has(rec.id)) errors.push(`${file} [${i}]: duplicate id "${rec.id}" (also in ${seenIds.get(rec.id)}).`);
        else seenIds.set(rec.id, file);
      } else if (type === 'glossary' && rec.Term) {
        const key = rec.Term.toLowerCase();
        if (seenTerms.has(key)) errors.push(`${file} [${i}]: duplicate Term "${rec.Term}" (also in ${seenTerms.get(key)}).`);
        else seenTerms.set(key, file);
      } else if (type === 'guide' && rec.title) {
        const key = rec.title.toLowerCase();
        if (seenTitles.has(key)) errors.push(`${file} [${i}]: duplicate guide title "${rec.title}" (also in ${seenTitles.get(key)}).`);
        else seenTitles.set(key, file);
      } else if ((type === 'sequence' || type === 'case' || type === 'pointclick') && rec.id) {
        if (seenIds.has(rec.id)) errors.push(`${file} [${i}]: duplicate id "${rec.id}" (also in ${seenIds.get(rec.id)}).`);
        else seenIds.set(rec.id, file);
      }
      if (type === 'case' && Array.isArray(rec.steps)) {
        rec.steps.forEach((st, j) => checkCaseStep(st, file, `[${i}].steps[${j}]`));
      }
      if (type === 'pointclick' && Array.isArray(rec.regions)) {
        const correct = rec.regions.filter((r) => r.correct).length;
        if (correct < 1) errors.push(`${file} [${i}]: at least one region must have correct:true.`);
        if (typeof rec.select === 'number' && rec.select > correct) {
          errors.push(`${file} [${i}]: select (${rec.select}) exceeds the number of correct regions (${correct}).`);
        }
        const ids = rec.regions.map((r) => r.id);
        if (new Set(ids).size !== ids.length) errors.push(`${file} [${i}]: region ids must be unique.`);
        if (rec.figure?.svg && !/viewBox=/.test(rec.figure.svg)) {
          errors.push(`${file} [${i}]: figure.svg must declare a viewBox (regions use its coordinates).`);
        }
      }
    });
  }
}

if (errors.length) {
  console.error(`\n✗ Content validation failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n`);
  for (const e of errors) console.error('  - ' + e);
  console.error('');
  process.exit(1);
}

console.log(`✓ Validated ${recordCount} records across ${fileCount} files — all good.`);
