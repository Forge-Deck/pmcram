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
   - Dynamic figure / point-and-click questions → `content/figuregen/figuregen-yourtopic.json`
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
- Set `type`, `select`, and `present` consistently: for `single`, `correct.length >= select`; for `multi`, `correct.length === select`; and `present` must be `> select` and `<= correct.length + distractors.length`.
- Give **at least one more distractor than strictly needed** so the wrong set can vary (more is better).
- Every option should be plausible. Put the misconception in each distractor's `trap`, and the reasoning in each correct option's `why`.
- `why`, `trap`, `explanation`, and `references` are **optional** — a question with just correct/distractor `text` works (scored right/wrong only). But please add rationale where you can; it's the main study value.
- Don't encode the answer position — never write "the correct answer is A". Options are shuffled at runtime.
- Cite PMI standards in `references`. **Do not paste copyrighted text**; summarise in your own words.
- Provide alternative `prompts` wordings when you can — it keeps repeat practice fresh.
- **Categorise it.** Set `domain` (`People` / `Process` / `Business Environment`) and `subDomain` (one of the 26 canonical sub-categories — see the taxonomy table in the README). Domain by dominant theme; anything centred on risk, governance, compliance, external environment, org change, change control, or impediments goes to **Business Environment**, and **risk is decisive**.

### Dynamic pooled-correct questions (`questions-dynamic-*.json`, `dyn-*`)
Same schema as a standard question, but authored so the engine can draw a fresh variant every time. Use these conventions when adding to (or modelling on) the `questions-dynamic-*` banks:
- **Pools, not fixed sets.** Give `correct[]` **several interchangeable correct answers** (each fully correct on its own, with a `why`) and `distractors[]` a **large pool** (8–10, each with a `trap`). The engine picks one prompt, `select` correct, and `present-select` distractors, then shuffles; the chosen option's `why`/`trap` shows as inline feedback.
- **`group`.** Give a `group` key so sibling phrasings of the same concept are never served together in one batch.
- **Equal-legitimacy style.** All four served options must read as reasonable PMP actions. Make distractors wrong on **target / sequence / owner / scope / timing** — not obviously silly. No absolutes ("always/never/immediately"), no covert/unethical or self-justifying tells that give the key away.
- **Length parity per draw.** The correct answer must not be the longest or most detailed option. Keep all options comparable — **at most 2 distractors shorter than the longest correct** — so length never signals the answer.

### Specialised banks (acronyms / formulae / charts & tools)
Plain `question/v1` records grouped into `questions-acronyms.json`, `questions-formulae.json`, and `questions-charts-and-tools.json`. Author them like standard single-select questions (`present:4`, one `correct`, ≥3 distractors); set `topic` to the bank ("Acronyms & Abbreviations", "Formulae & Calculations", "Charts & Visual Tools") and `subtopic` to the specific item, plus the usual `domain`/`subDomain`. Put the confusion each wrong answer represents in its `trap`.

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

### Dynamic figure / point-and-click (`schema/figuregen.schema.json`)
- A **figuregen template** rolls a randomised interactive figure at runtime — the app draws the figure and decides the answer from your spec, so each attempt differs. Follow `schema/figuregen.schema.json`.
- Pick a **`kind`** and provide its answer block:
  - **`hotspot`** — tap the right area(s): `regions[]` of `{ id, x, y, w, h, correct, label?, why? }` (use `freeSelect:true` when the count of correct spots varies per roll).
  - **`choice`** — a multiple-choice question about the figure: `choices[]` of `{ text, correct, why? }` (add `multi:true`/`select` for choose-N).
  - **`dragdrop`** — drag labels onto zones: `regions[]` (drop zones) + `tokens[]` of `{ label, target, why? }`, where `target` is the correct region id (empty-string target = a decoy that stays in the tray).
  - The chart-driven kinds `gantt` / `pareto` / `assign` are also allowed — model them on the existing `content/figuregen/` templates.
- Declare `vars` (random samples), optional `derived` values, an optional `guard` (re-roll constraint), and a `draw` list of primitives (or a named `chart`). Numeric/string fields and `correct` are **expressions** evaluated against the roll (e.g. `"correct": "i == worst"`). Every roll must yield the right number of correct answers.
- Add the required `schema` (`"figuregen/v1"`), a kebab `id`, `kind`, `domain`, `viewBox` (`[w, h]`), and a `prompt`; add an `explanation` where useful. See the worked templates in `content/figuregen/` and the engine source (`src/study/figuregen/` in the app) for the exact ops + expression functions.

## Validate before you PR

```bash
npm install                          # one-time
node scripts/validate.mjs            # (= npm run validate) schemas + cross-field rules + duplicate keys; must exit clean
node scripts/generate-manifest.mjs   # (= npm run manifest) optional locally — regenerates content/manifest.json
```

The full workflow: **edit/add JSON → `node scripts/validate.mjs` passes → `node scripts/generate-manifest.mjs` → open a PR.** CI runs the same validation on your pull request, so fixing it locally first is the fastest path to merge. You don't have to commit `content/manifest.json` — **CI regenerates and commits it on push to `main`** — but running the manifest script locally is a good final check.

## PR checklist

- [ ] One new file in the correct folder, named per convention.
- [ ] Valid JSON array; validates against the schema.
- [ ] No duplicate `Term` (glossary) already in the repo. (Question/card ids are optional and auto-derived — only check for dupes if you set one explicitly.)
- [ ] Sources cited; no copyrighted text reproduced.
- [ ] Questions: `select` / `present` / `correct` / `distractors` counts are consistent, and `domain` + `subDomain` are set from the 26-item taxonomy.
- [ ] Dynamic (`dyn-*`) questions: pooled `correct`/`distractors`, a `group`, equal-legitimacy options, and per-draw length parity.

## Scope & conduct

This is an independent study aid, **not affiliated with or endorsed by PMI**. Contribute original wording only. Be accurate, cite standards, and keep examples generic (no confidential or client-identifying material).
