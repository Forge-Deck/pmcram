# PM Cram — open content

Glossary terms, flashcards, and practice questions for the **PM Cram: PMP Prep** app. Everything here is plain JSON, version-controlled, schema-validated, and open to contribution.

> **Independent PMP revision content. Not affiliated with or endorsed by PMI.** PMP and PMI are marks of the Project Management Institute, Inc. Citations reference PMI standards for study purposes only; no PMI text is reproduced.

---

## How the app uses this repo

1. On sync, the app reads **`content/manifest.json`** (a CI-generated index) — or, as a fallback, **lists the files** in `content/glossary/`, `content/questions/`, and `content/decks/` via the GitHub Contents API.
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
  schema/          # JSON Schemas used by CI + contributors to validate
    question.schema.json
    glossary.schema.json
    deck.schema.json
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

Every `.json` file under `glossary/`, `questions/`, and `decks/` is a **JSON array of records**.

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

**Multi-line backs:** put real line breaks in the `back` string with `\n` — the app renders each line separately, so don't run everything into one sentence. Example:

```json
"back": "CPI = EV / AC\nCPI > 1 means under budget.\nCPI < 1 means over budget.\nCPI = 1.0 is exactly on budget."
```

renders as four lines. **Formula convention:** put the formula on the **first line** and include an `=`; the app shows that first line in monospace so it reads as a formula, with the explanation lines beneath it. (Use `\n\n` if you want a blank line between paragraphs.)

---

### Study guides (`guides/`)
Read-and-absorb material that isn't recall-tested — mindset, agile, exam strategy. Follow `schema/guide.schema.json`. A guide has a `title` (its natural key), a `category`, and an array of `sections`, each with a `heading`, a `body`, and an optional `tip` (shown as a highlighted exam-tip callout). **Text only — no images.**

Body formatting is deliberately simple (no markdown): a **blank line** starts a new paragraph, and lines beginning with `- ` render as a bullet list.

```jsonc
{
  "title": "The PMP Mindset",
  "category": "Mindset",
  "summary": "How PMI expects a project manager to think.",
  "sections": [
    { "heading": "Assess before you act",
      "body": "Gather the facts and review the plan before deciding.\n\n- Don't react\n- Investigate first",
      "tip": "The first step is usually to investigate, not to act or escalate." }
  ]
}
```

## Append-only model

- **Adding content?** Create a **new file** (e.g. `questions/contrib-2026-06-yourhandle.json`). Don't append to the large curated files.
- **Fixing an error?** Edit the record **in the file where it lives** — corrections are the one time you edit existing files.
- Records are keyed by `id` (questions/cards) or `Term` (glossary); if two share a key, the **last one merged wins**, so canonical corrections take precedence. Don't duplicate an existing key — CI rejects duplicates.

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
