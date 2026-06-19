# Contributing to PM Cram content

Thanks for helping improve the question bank and glossary. Contributions are JSON files reviewed by pull request. You don't need to touch the app — just the content.

## TL;DR

1. **Fork** the repo.
2. **Add one new file** in the right folder (don't grow the big curated files):
   - Glossary terms → `content/glossary/contrib-YYYY-MM-yourhandle.json`
   - Questions → `content/questions/contrib-YYYY-MM-yourhandle.json`
   - Custom flashcards → `content/decks/cards-yourdeck.json`
   - Study guides → `content/guides/guide-yourtopic.json`
   - Sequencing questions → `content/sequences/seq-yourtopic.json`
   - Multi-step cases → `content/cases/case-yourtopic.json`
   - Point-and-click questions → `content/pointclick/pc-yourtopic.json`
3. Each file is a **JSON array** of records that validate against the matching file in `content/schema/`.
4. **Open a pull request.** CI validates your file; a maintainer reviews accuracy and merges.

You can put 1 record or 50 in a file. New file = the app picks it up on next sync. The only time you edit an existing file is to **correct an error** in a record already there.

## Naming

- Contribution files: `contrib-YYYY-MM-yourhandle.json` (e.g. `contrib-2026-06-jdoe.json`).
- Curated/topic files (maintainers): `questions-<topic>.json`, `glossary-<range>.json`, `cards-<deck>.json`.

## IDs and keys

- **Questions / cards:** you do **not** need to write an `id`. The app derives a stable id from the record's content, so there's nothing to invent, look up, or keep unique. Only set an explicit kebab-case `id` (e.g. `risk-0042`) if you're a maintainer pinning a *correctable* identity — a question you intend to edit later without it counting as new. If you do set one, don't reuse an existing id.
- **Glossary** records are keyed by `Term` (case-insensitive). Don't add a term that already exists; improve the existing one instead (a correction PR).

## Rules by type

### Glossary (`schema/glossary.schema.json`)
- Field **order and names** must match exactly: `Term, Core Meaning, Depth, Expansion, Deep Dive, Contrast, Example, Related Terms, Tier, Source`.
- `Depth` ∈ `Atomic | Standard | Foundational`. `Deep Dive` is `null` unless `Foundational`.
- Expansion length: Atomic ~2 sentences, Standard 3–5, Foundational a tight 3–4 sentence summary. **Don't pad to length.**
- **STRICT JSON:** no `"` inside any string value — use single quotes for inner quoting. In `Source`, write the standard + term plainly (no quote marks around the term).
- `Core glossary` terms need a real PMI source. `"not a formal PMI glossary entry"` is allowed **only** for `Practitioner term` tier.

### Questions (`schema/question.schema.json`)
- Set `type`, `select`, and `present` consistently: `correct.length === select`, and `present` must be `> select` and `<= correct.length + distractors.length`.
- Give **at least one more distractor than strictly needed** so the wrong set can vary (more is better).
- Every option should be plausible. Put the misconception in each distractor's `trap`, and the reasoning in each correct option's `why`.
- `why`, `trap`, `explanation`, and `references` are **optional** — a question with just correct/distractor `text` works (scored right/wrong only). But please add rationale where you can; it's the main study value.
- Don't encode the answer position — never write "the correct answer is A". Options are shuffled at runtime.
- Cite PMI standards in `references`. **Do not paste copyrighted text**; summarise in your own words.
- Provide alternative `prompts` wordings when you can — it keeps repeat practice fresh.

### Cards (`schema/deck.schema.json`)
- Only for non-glossary content (formulas, mnemonics). `front` is the prompt, `back` the answer.
- `back` formats like a guide body: blank line = new paragraph, `- ` lines = bullets.
- Optional enrichment: `formula` (shown prominently, revealed on the back), `legend` (`[{symbol, meaning}]` variable key), `figure` (`{svg|image, caption}` — same as guide figures), and `tip` (accent callout). Use these to make a card genuinely explain the concept, not just state it.

### Guides (`schema/guide.schema.json`)
- Read-and-absorb notes (mindset, agile, exam strategy, charts & diagrams), keyed by `title`.
- Each `sections` entry has a `heading`, a `body`, and an optional `tip`. In `body`, a blank line starts a paragraph and `- ` lines become bullets.
- A section may also carry a `figure` (`{svg|image, caption}`) — see **Figures** in the README for the rules (theme-aware SVG via `currentColor`, `viewBox` sets the aspect, single-quote attributes).
- Write original wording in your own voice; keep it current to the ECO-based exam.

### Sequencing questions (`schema/sequence.schema.json`)
- A `prompt` plus a `steps[]` array **in the correct order** (3–8 steps); the app shuffles them for the user to rearrange. Don't pre-shuffle.
- Each step is `{ "text": "…" }` with an optional one-line `note` shown on review. Add an `explanation` for the overall ordering where you can.
- Order must be genuinely unambiguous — if two steps could reasonably swap, reword so there's one defensible sequence.

### Multi-step cases (`schema/case.schema.json`)
- A shared `scenario` plus `steps[]` (2–8). **Each step is a mini-question** with `prompt`, `correct[]` and `distractors[]` (same shape and rules as a normal question — `why`/`trap` optional but encouraged).
- Steps are answered in order and a later step may reveal the answer to an earlier one — that's fine, the app hides the next step until the current is answered. Order the steps so the case builds naturally.
- Set a per-step `domain` so misses feed the right weak area; add an optional `label` (e.g. "People + Process").

### Point-and-click (`schema/pointclick.schema.json`)
- A `prompt`, a `figure.svg` (theme-aware, **must have a `viewBox`**), and `regions[]` — rectangular hotspots in the SVG's viewBox coordinates (`x,y,w,h`), at least one flagged `correct: true`.
- Hotspots are invisible at runtime, so the **graphic must make the clickable spots obvious**; align each region's box to its SVG element. Add `why` per region for review.
- `select` defaults to the number of correct regions; set it only to require fewer picks. Use `currentColor` for ink and `<polygon>` arrowheads (no `<marker>`).

## Validate before you PR

```bash
npm install      # one-time
npm run validate # checks every file against the schemas + cross-field rules + duplicate keys
```

CI runs the same `npm run validate` on your pull request, so fixing it locally first is the fastest path to merge. (You don't need to touch `content/manifest.json` — CI regenerates it on merge.)

## PR checklist

- [ ] One new file in the correct folder, named per convention.
- [ ] Valid JSON array; validates against the schema.
- [ ] No duplicate `Term` (glossary) already in the repo. (Question/card ids are optional and auto-derived — only check for dupes if you set one explicitly.)
- [ ] Sources cited; no copyrighted text reproduced.
- [ ] Questions: `select` / `present` / `correct` / `distractors` counts are consistent.

## Scope & conduct

This is an independent study aid, **not affiliated with or endorsed by PMI**. Contribute original wording only. Be accurate, cite standards, and keep examples generic (no confidential or client-identifying material).
