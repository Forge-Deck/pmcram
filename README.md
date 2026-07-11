# PM Cram — open content

Study content for the **PM Cram: PMP Prep** app — glossary terms, flashcards, practice questions, study guides, sequencing (drag-to-order) and multi-step case questions. Everything here is plain JSON, version-controlled, schema-validated, and open to contribution.

> **Independent PMP revision content. Not affiliated with or endorsed by PMI.** PMP and PMI are marks of the Project Management Institute, Inc. Citations reference PMI standards for study purposes only; no PMI text is reproduced.

---

## How the app uses this repo

1. On sync, the app reads **`content/manifest.json`** (a CI-generated per-file index with sha256 hashes). For a first sync or when many files changed it downloads the single-file **`content/bundle.json`** payload — the entire library in one request. For incremental updates it fetches only the files whose sha256 changed since the last sync.
2. Records from each file are **merged into a local store** keyed by `id` (questions/cards) or `Term` (glossary).
3. The merged store is **cached on-device** (filesystem, not AsyncStorage) so the app works offline between syncs.

Because the app merges *all* files, **content is added by dropping in new files — not by editing big ones.** See [Append-only model](#append-only-model).

> The app points at this repo via `DEFAULT_CONFIG` in `src/content/sync.ts` — currently `owner: Forge-Deck`, `repo: pmcram`, `branch: main`. If you move it, update those three values.

---

## Repository layout

```
content/
  glossary/        # glossary terms — these double as flashcards
  questions/       # practice / exam questions (dynamically assembled)
  decks/           # OPTIONAL standalone flashcards (formulas, mnemonics)
  guides/          # OPTIONAL read-and-absorb study guides (mindset, agile, strategy)
  sequences/       # OPTIONAL drag-to-order ("put the steps in sequence") questions
  cases/           # OPTIONAL multi-step case studies (one scenario, linked questions)
  figuregen/       # OPTIONAL dynamic point-and-click templates (rolled into random variants)
  schema/          # JSON Schemas used by CI + contributors to validate
    glossary.schema.json
    question.schema.json
    deck.schema.json
    guide.schema.json
    sequence.schema.json
    case.schema.json
    figuregen.schema.json
  bundle.json      # CI-generated full-content payload — the whole library in one file (do not edit by hand)
  manifest.json    # CI-generated per-file index with sha256 hashes (do not edit by hand)
scripts/
  validate.mjs           # validates every file against the schemas (+ cross-field checks)
  generate-bundle.mjs    # regenerates content/bundle.json (full payload)
  generate-manifest.mjs  # regenerates content/manifest.json (per-file index; `npm run manifest` runs both)
.github/workflows/
  validate.yml     # runs validation on every PR and push
  manifest.yml     # regenerates + commits bundle.json + manifest.json on merge to main
CONTRIBUTING.md
README.md
```

Every `.json` file under `glossary/`, `questions/`, `decks/`, `guides/`, `sequences/`, `cases/`, and `figuregen/` is a **JSON array of records**.

---

## Content types

### Glossary terms (= flashcards)
Follow `schema/glossary.schema.json` and the exact field order: `Term, Core Meaning, Depth, Expansion, Deep Dive, Contrast, Example, Related Terms, Tier, Source`. In the app the **Term is the flashcard front** and Core Meaning / Expansion is the back.

- `Deep Dive` is `null` unless `Depth` is `Foundational`.
- **STRICT JSON:** never put a `"` inside a string value — use single quotes for any inner quote. In `Source`, write the standard name and term plainly, no quotation marks.
- A `Core glossary` term must cite a real PMI source. `not a formal PMI glossary entry` is only valid for the `Practitioner term` tier.

### Standard questions (`question/v1`, dynamically assembled)
Follow `schema/question.schema.json`. **Options are never stored as a fixed A/B/C/D list.** Each question stores the correct answer(s) and a *pool* of wrong answers, and the app builds + shuffles the visible options at runtime.

**Assembly rule:** render `present` options = all of `correct` (when `correct.length === select`) + a random sample of `present - select` distractors, then shuffle. (For a `single` question, `correct` may itself be a *pool* of interchangeable correct phrasings — the app shows one at random. For `multi`, `correct.length` must equal `select`, so every correct answer is shown.)

| Want | Set |
|---|---|
| 1 correct of 4 | `type:single, select:1, present:4`, ≥3 distractors |
| Choose 2 of 6 | `type:multi, select:2, present:6`, `correct` has 2, ≥4 distractors |
| Choose 4 of 6 | `type:multi, select:4, present:6`, `correct` has 4, ≥2 distractors |
| "Which is NOT…" | `type:single, select:1`, the odd-one-out is the single `correct` |

**Required: `domain`, `type`, `select`, `present`, `prompts`, `correct`, `distractors`.** You do **not** need to write an `id` — the app derives a stable one from the question's content, so contributors never have to invent or track ids. (`why`, `trap`, `explanation`, `references` are optional too — a bare question still works, scored right/wrong; adding rationale is most of the study value.) Each `correct[]` item is `{ text, why? }`; each `distractors[]` item is `{ text, trap? }`. Categorise with `domain` + `subDomain` — see [Sub-category taxonomy](#sub-category-taxonomy).

```jsonc
{
  "schema": "question/v1", "domain": "Process", "subDomain": "Scope Management",
  "type": "single", "select": 1, "present": 4,
  "prompts": [
    "A stakeholder asks to add a feature mid-sprint. What should the PM do first?",
    "Mid-iteration a new requirement arrives. What is the best first action?"
  ],
  "correct":     [ { "text": "Assess the change's impact and route it through the change-control process.", "why": "Scope changes go through integrated change control, not ad-hoc." } ],
  "distractors": [
    { "text": "Add it immediately to keep the stakeholder happy.", "trap": "Bypasses change control; uncontrolled scope creep." },
    { "text": "Reject it outright as out of scope.", "trap": "Refusing to evaluate is as wrong as accepting blindly." },
    { "text": "Defer it to the next project phase without analysis.", "trap": "Still skips impact assessment." }
  ],
  "explanation": "Evaluate impact, then let change control decide.",
  "references": ["PMBOK Guide, Perform Integrated Change Control"]
}
```

### Dynamic pooled-correct questions (`questions-dynamic-*.json`, `questions-scenarios-*.json`)
A higher-variance flavour of the standard question, used for the `questions-dynamic-*` banks (ids prefixed `dyn-`) and the larger `questions-scenarios-*` banks (provenance-neutral ids). Together these make up the **4,058 group-keyed questions** that carry a `group` field. Same `question/v1` schema — no new fields — but authored so the runtime engine can draw a fresh-feeling variant every time:

- **`prompts[]`** — several equivalent wordings of the same scenario; the engine picks **one** at random.
- **`correct[]`** — a **POOL of interchangeable correct answers** (typically 3), each `{ text, why }`. For a `single` question the engine surfaces just `select` (one) of them, so the "right answer" wording rotates. Every entry must be fully correct on its own.
- **`distractors[]`** — a **large POOL** (often 8–10), each `{ text, trap }`. The engine samples `present - select` of them, so the wrong set varies between draws.
- **`group`** — a variant-group key. Questions sharing a `group` are phrasings of the **same** concept and are **never both served** in one mock or focused batch (one variant per group per batch).
- **`select` / `present`** — as for standard questions (usually `single`, `select:1`, `present:4`).

**How it renders:** the engine samples one `prompt` + `select` from `correct` + `present-select` from `distractors`, then **shuffles**. The chosen option's per-option `why` (correct) or `trap` (distractor) renders as **inline feedback** on review.

**STYLE expectations (these are what make a dynamic/group-keyed question fair):**
- **All four served options must read as equally-legitimate PMP actions.** Distractors are wrong on **target, sequence, owner, scope, or timing** — not because they're obviously silly. No absolutes ("always/never/immediately"), no covert/unethical tells, no self-justifying phrasing that telegraphs the key.
- **Per-draw LENGTH PARITY.** Because only one `correct` and a sample of distractors are shown together, the *correct answer must not be the longest or most detailed option*. Rule of thumb: **at most 2 distractors may be shorter than the longest correct** — keep all four options comparable in length and specificity so length never signals the answer.

```jsonc
{
  "schema": "question/v1", "id": "dyn-impostor-syndrome", "domain": "People",
  "type": "single", "select": 1, "present": 4, "group": "impostor-syndrome",
  "subDomain": "Lead Project Team",
  "prompts": [
    "A highly competent team member persistently doubts their accomplishments and fears exposure as a fraud despite clear evidence of skill. Which pattern is this?",
    "A senior engineer who has delivered major projects still fears colleagues will discover they lack real expertise. Which pattern is this?"
  ],
  "correct": [
    { "text": "Impostor Syndrome — the mirror of the Dunning-Kruger effect, where the least skilled are the most overconfident.",
      "why": "Skilled people underestimate their competence — the inverse of Dunning-Kruger." },
    { "text": "This is Impostor Syndrome: skilled people doubt their competence, the inverse of Dunning-Kruger.",
      "why": "The defining feature is competent self-doubt despite evidence of skill." }
  ],
  "distractors": [
    { "text": "This is the Dunning-Kruger effect, where the most competent people persistently doubt themselves.",
      "trap": "Names the counterpart: Dunning-Kruger is overconfidence in the unskilled." },
    { "text": "This reflects the Peter Principle — the person was promoted beyond their competence.",
      "trap": "Peter Principle is rising to incompetence; here the person IS competent and merely doubts it." },
    { "text": "This is a classic symptom of burnout from sustained high performance without recovery.",
      "trap": "Burnout is exhaustion; the defining feature here is fear of being exposed as a fraud." }
  ],
  "explanation": "Impostor Syndrome is the evidence-defying belief by capable people that they are frauds."
}
```

### Specialised question banks (acronyms, formulae, charts & tools)
These are **not a different schema** — they are ordinary `question/v1` records, grouped into their own curated files, that drill one recall skill. They are distinguished by their `topic` and file name, not by any special field:

- **`questions-acronyms.json`** — "what does WBS stand for" expand-the-acronym recall (`topic: "Acronyms & Abbreviations"`, `subtopic` = the acronym).
- **`questions-formulae.json`** — EVM/finance calculation questions with numeric prompts and worked `why` (`topic: "Formulae & Calculations"`). Use `decks/` cards for the formula *reference* (see below); use these questions to *test* the calculation.
- **`questions-charts-and-tools.json`** — "which chart/tool fits this need" recognition questions (`topic: "Charts & Visual Tools"`).

Author them exactly like standard questions (single-select, `present:4`, one `correct`, ≥3 distractors, each distractor's `trap` naming the confusion). They still carry `domain` + `subDomain` for tracking.

### Sub-category taxonomy
Every question (standard, dynamic, specialised, case step, sequence, figuregen) is categorised by two fields:

- **`domain`** — the top-level PMP ECO domain: `People`, `Process`, or `Business Environment`.
- **`subDomain`** — one of the **26 canonical sub-categories** below. This is what powers per-topic weak-area tracking, so pick the single best fit.

| Domain | Sub-categories (`subDomain`) |
|---|---|
| **People** | Build Shared Vision · Manage Conflict · Lead Project Team · Engage Stakeholders · Align Expectations · Manage Expectations · Knowledge Transfer · Communication Management |
| **Process** | Integrated Planning · Scope Management · Value Delivery · Resource Management · Procurement Management · Financial Management · Quality Management · Schedule Management · Project Monitoring · Project Closure |
| **Business Environment** | Establish Governance · Compliance Management · Change Control · Manage Impediments · Risk Management · Continuous Improvement · Support Org Change · Monitor External Environment |

**Assignment rule.** Choose the `domain` by the item's *dominant theme*, then the closest `subDomain`. Anything centred on **risk, governance, compliance, external environment, organisational change, change control, or impediments → Business Environment** — even when it also touches people or process. **Risk is decisive:** if managing uncertainty/risk is the core of the item, it is `Business Environment → Risk Management` regardless of surface topic.

### Custom flashcards (`decks/`)
Only for content that isn't a glossary term (formulas, mnemonics). Follow `schema/deck.schema.json` (`front` / `back`), grouped by a `deck` name (the app lists each deck for focused study).

Cards can be **enriched** beyond plain front/back — all optional:
- **`formula`** — the equation, shown prominently above the answer (e.g. `"CPI = EV / AC"`).
- **`legend`** — a variable key: `[{ "symbol": "EV", "meaning": "Earned Value" }, …]`.
- **`figure`** — an explanatory diagram/graph, same model as guides (`svg` inline markup using `currentColor`, or an `image` path, plus a `caption`).
- **`tip`** — an accent exam-tip callout.

The `back` uses the same light formatting as guides: a **blank line** starts a new paragraph, and lines beginning with `- ` render as a bullet list.

```jsonc
{
  "deck": "PMP Formulae",
  "front": "Cost Performance Index (CPI)",
  "formula": "CPI = EV / AC",
  "legend": [
    { "symbol": "EV", "meaning": "Earned Value" },
    { "symbol": "AC", "meaning": "Actual Cost" }
  ],
  "back": "Cost efficiency.\n\n- > 1.0 → under budget\n- < 1.0 → over budget",
  "figure": { "svg": "<svg viewBox='0 0 320 110' …>…</svg>", "caption": "Above 1.0 is good." },
  "tip": "Above 1.0 is always good for CPI and SPI."
}
```

The front is the prompt (e.g. the formula's name); `formula` is revealed on the **back**, so recall still works.

---

### Study guides (`guides/`)
Read-and-absorb material that isn't recall-tested — mindset, agile, exam strategy, charts & diagrams. Follow `schema/guide.schema.json`. A guide has a `title` (its natural key), a `category`, and an array of `sections`, each with a `heading`, a `body`, an optional `tip` (highlighted exam-tip callout), and an optional `figure`.

Guides with `"category": "Exam"` appear in the dedicated **Exam Prep** screen in the app (overviews, tips & tricks, hard-question breakdowns, cheat sheets) and are excluded from the main Guides list. All other categories appear in the main Guides list, filterable by topic tag.

Body formatting is deliberately simple (no markdown): a **blank line** starts a new paragraph, and lines beginning with `- ` render as a bullet list.

```jsonc
{
  "title": "The PMP Mindset",
  "category": "Mindset",
  "summary": "How PMI expects a project manager to think.",
  "sections": [
    { "heading": "Assess before you act",
      "body": "Gather the facts and review the plan before deciding.\n\n- Don't react\n- Investigate first",
      "tip": "The first step is usually to investigate, not to act or escalate.",
      "figure": { "svg": "<svg viewBox='0 0 320 180' …>…</svg>", "caption": "Optional diagram." } }
  ]
}
```

### Figures (guides & deck cards)
Both guide sections and deck cards accept an optional **`figure`** — `{ svg?, image?, caption? }`:

- **`svg`** — inline SVG markup. Use **`currentColor`** for strokes/labels so it themes to light/dark automatically; the app reads the `viewBox` to size it, so choose whatever aspect fits (e.g. `viewBox='0 0 320 190'`). Accent colours (blue `#1F5FA8`, red `#B5462F`, green `#2F6F5E`) are fine for data; avoid hard-coded greys for ink. **Single-quote** attributes (the JSON wraps the SVG in double quotes). **Do not use XML entities in `<text>`:** react-native-svg renders `&amp;`/`&lt;`/`&gt;` **literally** (you'd see `&lt;` on screen), and a literal `<`/`>` breaks SVG parsing — so write a literal `&` for ampersands (e.g. `T&M`) and use Unicode glyphs (`‹`/`›`) or words for less-/greater-than. The app injects its own font into figure text, so don't set `font-family`.
- **`image`** — a repo-relative path (e.g. `content/assets/foo.png`) or absolute URL; rendered on a white card so photos read in dark mode.
- **`caption`** — a short line shown beneath the figure.

> `react-native-svg` doesn't support `<marker>`, so draw arrowheads as small `<polygon>`s — and **orient each arrowhead to its line's angle** (derive the triangle from the line's direction so the tip sits on the line end and points along it). A fixed horizontal triangle on a diagonal line renders visibly misaligned.

### Sequencing questions (`sequences/`)
Drag-to-order questions. Follow `schema/sequence.schema.json`. Store a `prompt` and a `steps[]` array **in the correct order** — the app shuffles them and the user drags them back into sequence. Each step has `text` and an optional one-line `note` (shown on review). `id` is optional (derived). 3–8 steps.

```jsonc
{
  "prompt": "Order the steps for handling an underperforming team member.",
  "domain": "People",
  "steps": [
    { "text": "Hold a private 1:1 to understand the cause", "note": "Start supportively and in private." },
    { "text": "Document expectations and follow up" },
    { "text": "Agree a Performance Improvement Plan" }
  ],
  "explanation": "Coach and document before escalating; replacement is the last resort."
}
```

### Multi-step cases (`cases/`)
One shared scenario with several linked questions answered in order. Follow `schema/case.schema.json`. Store a `scenario` and a `steps[]` array; **each step is a mini-question** with its own `prompt`, `correct[]` and `distractors[]` (same shape as a normal question, so options still shuffle). The app pins the scenario, reveals one step at a time, and **only unlocks the next step once the current one is answered** (so a later step can't spoil an earlier one). Optional per-step `domain`/`label`. `id` is optional (derived). 2–8 steps.

```jsonc
{
  "title": "Underperformer on a hybrid project",
  "scenario": "You are leading a hybrid digital-transformation project …",
  "steps": [
    {
      "label": "Business Environment focus",
      "prompt": "The sponsor worries delays threaten ESG targets. What do you do first?",
      "correct":     [ { "text": "Analyse the impact on value, benefits and ESG alignment", "why": "…" } ],
      "distractors": [ { "text": "Request a replacement from HR", "trap": "…" } ],
      "domain": "Business Environment"
    }
  ]
}
```

### Dynamic figure / point-and-click templates (`figuregen/`)
A 2026-style interactive figure authored as a **template** that the app rolls into a fresh randomised variant each time — no app build needed to add or edit one. Follow `schema/figuregen.schema.json`. A template declares random `vars`, optional `derived` values + a re-roll `guard`, a `draw` list of figure primitives (or a named `chart` style), and an answer block whose fields are **expressions** evaluated against the roll. The app's engine (`src/study/figuregen/`) renders the figure and grades the answer.

Required on every record: `schema` (`"figuregen/v1"`), `id` (kebab-case), `kind`, `domain`, `viewBox` (`[w, h]`), `prompt`. The three core interaction **kinds** are:

- **`hotspot`** — tap the correct area(s) of the figure. Answer block is **`regions[]`** (or an `{ items }` block), each `{ id, x, y, w, h, correct, label?, why? }`; `correct` is an expression that must be true for the tap target(s). Set `freeSelect:true` when the number of correct spots varies per roll. *(Example: the `resource-histogram` template — tap every over-allocated critical-path week.)*
- **`choice`** — a multiple-choice question *about* the figure. Answer block is **`choices[]`**, each `{ text, correct, why? }` (all expressions). Set `multi:true` / a `select` expression for choose-N.
- **`dragdrop`** — drag labels onto regions/targets. Answer block is **`regions[]`** (the drop zones) plus **`tokens[]`**, each token `{ label, target, why? }` where `target` is the id of the correct region (an empty-string target = a decoy that stays in the tray). *(Example: the `salience-venn-fill` template — drag salience labels onto a Power/Legitimacy/Urgency Venn.)*

The `kind` enum also allows the chart-driven kinds `gantt`, `pareto`, and `assign`, which pair with a named `chart`/`params` and their own item blocks (`bars`, `causes`, `answers`, …); see the worked templates in `content/figuregen/`.

```jsonc
{
  "schema": "figuregen/v1", "id": "cost-of-quality", "kind": "hotspot", "domain": "Process",
  "viewBox": [270, 204], "prompt": "Tap the largest cost of NONconformance.",
  "vars": { "v": { "sampleInt": [6, 24], "count": 4 } },
  "guard": "v[2] != v[3]",
  "derived": { "worst": "v[2] > v[3] ? 2 : 3", "bars": "[['Prevention',v[0]],['Appraisal',v[1]],['Internal',v[2]],['External',v[3]]]" },
  "draw": [ { "op": "repeat", "over": "bars", "as": "b", "do": [ { "op": "rect", "x": "30 + i*60", "y": "168 - 138*b[1]/26", "w": 46, "h": "138*b[1]/26" } ] } ],
  "regions": { "repeat": "bars", "as": "b", "items": [ { "id": "i", "x": "30 + i*60", "y": 30, "w": 46, "h": 138, "correct": "i == worst" } ] }
}
```

See the worked templates in `content/figuregen/` and the engine (expression functions, draw ops, `chart` styles) under `src/study/figuregen/` in the app repo. Numeric/string fields may be a literal or an expression; arrowheads use the auto-oriented `arrow` op; don't use XML entities in text.

## Append-only model

- **Adding content?** Create a **new file** (e.g. `questions/contrib-2026-06-yourhandle.json`). Don't append to the large curated files.
- **Fixing an error?** Edit the record **in the file where it lives** — corrections are the one time you edit existing files.
- Records are keyed by `id` (questions / cards / sequences / cases — derived from the record's content when you don't set one), `Term` (glossary), or `title` (guides); if two share a key, the **last one merged wins**, so canonical corrections take precedence. Don't duplicate an existing key — CI rejects duplicates.

---

## Working locally

```bash
npm install                          # one-time: installs the validator (ajv)
npm run validate                     # alias for: node scripts/validate.mjs
npm run bundle                       # alias for: node scripts/generate-bundle.mjs (full payload only)
npm run manifest                     # alias for: generate-bundle.mjs && generate-manifest.mjs (runs both)
```

Or call the scripts directly:

```bash
node scripts/validate.mjs            # validate every file against the schemas + cross-field checks (must pass / exits non-zero on error)
node scripts/generate-bundle.mjs     # regenerate content/bundle.json (full-content payload)
node scripts/generate-manifest.mjs   # regenerate content/manifest.json (per-file index; CI runs both on merge)
```

**Contributor workflow:** edit or add a JSON file → run `node scripts/validate.mjs` and make sure it passes → regenerate with `npm run manifest` → open a PR. CI runs the same validation on every pull request and push; on push to `main` it **regenerates and commits `content/bundle.json` + `content/manifest.json`** for you, so you never hand-edit either file. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** to submit a file.

---

## Licensing

The study content in this repository, including glossary terms, practice questions, and flashcard deck content under `content/`, is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0).

This license applies only to the open study content in this repository. It does not apply to the PM Cram app source code, app design, user interface, trademarks, branding, commercial services, or any private application infrastructure.

Repository scripts, schemas, and workflow files are licensed separately under the MIT License unless stated otherwise.

All contributed study content must be original wording. PMI references may be cited for study purposes, but PMI copyrighted text must not be copied or reproduced.

## Contribution licensing

By submitting content to this repository, you agree that your contribution is licensed under CC BY 4.0 and may be used, displayed, adapted, redistributed, and commercialised as part of the PM Cram app and related study services.
