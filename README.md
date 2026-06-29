# PM Cram — open content

Study content for the **PM Cram: PMP Prep** app — glossary terms, flashcards, practice questions, study guides, sequencing (drag-to-order) and multi-step case questions. Everything here is plain JSON, version-controlled, schema-validated, and open to contribution.

> **Independent PMP revision content. Not affiliated with or endorsed by PMI.** PMP and PMI are marks of the Project Management Institute, Inc. Citations reference PMI standards for study purposes only; no PMI text is reproduced.

---

## How the app uses this repo

1. On sync, the app reads **`content/manifest.json`** (a CI-generated index) — or, as a fallback, **lists the files** in each `content/` subfolder (`glossary/`, `questions/`, `decks/`, `guides/`, `sequences/`, `cases/`, `pointclick/`) via the GitHub Contents API.
2. It downloads each file from `raw.githubusercontent.com`, parses the JSON array, and **merges all records into a local store** keyed by `id` (questions/cards) or `Term` (glossary).
3. The store is **cached on-device** so the app works offline; sync only re-fetches files whose hash / `updatedAt` changed.

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
  pointclick/      # OPTIONAL point-and-click questions (tap hotspots on a graphic)
  schema/          # JSON Schemas used by CI + contributors to validate
    glossary.schema.json
    question.schema.json
    deck.schema.json
    guide.schema.json
    sequence.schema.json
    case.schema.json
    pointclick.schema.json
  manifest.json    # CI-generated sync index (do not edit by hand)
scripts/
  validate.mjs           # validates every file against the schemas (+ cross-field checks)
  generate-manifest.mjs  # regenerates content/manifest.json
.github/workflows/
  validate.yml     # runs validation on every PR and push
  manifest.yml     # regenerates + commits the manifest on merge to main
CONTRIBUTING.md
README.md
```

Every `.json` file under `glossary/`, `questions/`, `decks/`, `guides/`, `sequences/`, `cases/`, and `pointclick/` is a **JSON array of records**.

---

## Content types

### Glossary terms (= flashcards)
Follow `schema/glossary.schema.json` and the exact field order: `Term, Core Meaning, Depth, Expansion, Deep Dive, Contrast, Example, Related Terms, Tier, Source`. In the app the **Term is the flashcard front** and Core Meaning / Expansion is the back.

- `Deep Dive` is `null` unless `Depth` is `Foundational`.
- **STRICT JSON:** never put a `"` inside a string value — use single quotes for any inner quote. In `Source`, write the standard name and term plainly, no quotation marks.
- A `Core glossary` term must cite a real PMI source. `not a formal PMI glossary entry` is only valid for the `Practitioner term` tier.

### Questions (dynamically assembled)
Follow `schema/question.schema.json`. **Options are never stored as a fixed A/B/C/D list.** Each question stores the correct answer(s) and a *pool* of wrong answers, and the app builds + shuffles the visible options at runtime.

**Assembly rule:** render `present` options = all of `correct` (when `correct.length === select`) + a random sample of `present - select` distractors, then shuffle.

| Want | Set |
|---|---|
| 1 correct of 4 | `type:single, select:1, present:4`, ≥3 distractors |
| Choose 2 of 6 | `type:multi, select:2, present:6`, `correct` has 2, ≥4 distractors |
| Choose 4 of 6 | `type:multi, select:4, present:6`, `correct` has 4, ≥2 distractors |
| "Which is NOT…" | `type:single, select:1`, the odd-one-out is the single `correct` |

**Required: `domain`, `type`, `select`, `present`, `prompts`, `correct`, `distractors`.** You do **not** need to write an `id` — the app derives a stable one from the question's content, so contributors never have to invent or track ids. (`why`, `trap`, `explanation`, `references` are optional too — a bare question still works, scored right/wrong; adding rationale is most of the study value.)

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

### Point-and-click questions (`pointclick/`)
A 2026-style point-and-click: a graphic with **hidden hotspot regions**; the candidate taps the correct location(s). Follow `schema/pointclick.schema.json`. Store a `prompt`, a `figure` (inline theme-aware `svg` **with a `viewBox`**), and `regions[]` — rectangular hotspots **in the SVG's viewBox coordinates** (`x, y, w, h`), each flagged `correct` (with optional `label`/`why` shown on review). `select` defaults to the number of correct regions. `id` optional (derived).

```jsonc
{
  "prompt": "Tap the activity that is NOT on the critical path.",
  "domain": "Process",
  "figure": { "svg": "<svg viewBox='0 0 320 210' …>…</svg>" },
  "regions": [
    { "id": "a", "x": 14, "y": 46, "w": 56, "h": 46 },
    { "id": "c", "x": 132, "y": 146, "w": 56, "h": 46, "correct": true, "why": "C has float — off the critical path." }
  ],
  "explanation": "The critical path A→B→D has zero float; C can slip."
}
```

The hotspots are invisible (like the real exam) — the graphic must make the clickable spots obvious. Regions are scaled from the `viewBox` to the rendered image, so use the **same coordinates** as your SVG elements. Draw arrowheads as `<polygon>` (no `<marker>`), use `currentColor` for ink.

## Append-only model

- **Adding content?** Create a **new file** (e.g. `questions/contrib-2026-06-yourhandle.json`). Don't append to the large curated files.
- **Fixing an error?** Edit the record **in the file where it lives** — corrections are the one time you edit existing files.
- Records are keyed by `id` (questions / cards / sequences / cases — derived from the record's content when you don't set one), `Term` (glossary), or `title` (guides); if two share a key, the **last one merged wins**, so canonical corrections take precedence. Don't duplicate an existing key — CI rejects duplicates.

---

## Working locally

```bash
npm install          # one-time: installs the validator (ajv)
npm run validate     # validate every file against the schemas + cross-field checks
npm run manifest     # regenerate content/manifest.json (CI does this on merge)
```

CI runs `npm run validate` on every pull request and push; the manifest is regenerated and committed automatically when content changes land on `main`. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** to submit a file.

---

## Licensing

The study content in this repository, including glossary terms, practice questions, and flashcard deck content under `content/`, is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0).

This license applies only to the open study content in this repository. It does not apply to the PM Cram app source code, app design, user interface, trademarks, branding, commercial services, or any private application infrastructure.

Repository scripts, schemas, and workflow files are licensed separately under the MIT License unless stated otherwise.

All contributed study content must be original wording. PMI references may be cited for study purposes, but PMI copyrighted text must not be copied or reproduced.

## Contribution licensing

By submitting content to this repository, you agree that your contribution is licensed under CC BY 4.0 and may be used, displayed, adapted, redistributed, and commercialised as part of the PM Cram app and related study services.
