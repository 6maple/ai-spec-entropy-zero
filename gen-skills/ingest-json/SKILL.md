---
name: ingest-json
description: Use when processing raw Markdown knowledge from docs/raw/ into structured JSON notes and review cards. Outputs docs/notes/*.json (indexed leaf notes) and docs/note-cards/*.json (spaced-repetition flashcards). Simulates how a human learner takes notes — extracting atomic claims, supporting evidence, conceptual hooks, and anti-patterns — rather than simply compressing content. Trigger this skill whenever the user wants to ingest, process, or convert a raw knowledge document into a structured knowledge base entry.
---

# Ingest JSON

## Overview

Transform raw Markdown documents into two JSON artifacts that power the Entropy Zero knowledge system:

- **`docs/notes/<slug>.json`** — A structured "leaf note" capturing the essence, atomic claims, evidence, refinements, and conceptual links of a source document.
- **`docs/note-cards/<slug>.json`** — A set of spaced-repetition flashcards derived from that note.

**Core principle (Karpathy's LLM Wiki + Entropy Reduction):** Knowledge should compound once at ingest time, not be re-derived on every query. The goal is not to compress content — it is to simulate how a thoughtful learner reads, highlights, questions, and connects ideas. Think: handwritten margin notes, not a summary bot.

**Input:** One or more Markdown files in `docs/raw/`
**Output:** JSON files in `docs/notes/` and `docs/note-cards/`

---

## When to Use

- User drops a new document in `docs/raw/` and wants it processed
- User says "ingest this", "process this into notes", "make flashcards from this"
- User wants to add knowledge to the structured wiki/knowledge base

**Do NOT use when:**

- The input is already structured data (databases, spreadsheets)
- The user wants a quick summary (just answer inline)
- The content is reference docs that won't be revisited

---

## The Four-Stage Workflow

```
Stage 1: Read & Deconstruct
  ↓  (identify thesis, sections, atomic concepts with line numbers)
Stage 2: Generate Leaf Note JSON
  ↓  (claims + evidence + refinement + hooks)
Stage 3: Generate Review Card JSON
  ↓  (qa, fill_in_blank, error_correction cards)
Stage 4: Conflict Check & Save
  ↓  (check existing notes, flag contradictions, write files)
```

---

## Stage 1: Read & Deconstruct

**Goal:** Read the source holistically. Identify the main thesis, structural sections, and 3–8 atomic concepts. Track line numbers precisely — they are required for output traceability.

**Step 1.1 — Load the source file:**

Use `read_file` to read the target file from `docs/raw/`. If the user didn't specify a filename, list `docs/raw/` and ask which file to process.

**Step 1.2 — Apply this Deconstruction Prompt (execute it yourself, do not call an external API):**

```
I am reading this document as a learner taking notes for the first time.

Tasks:
1. THESIS: State the central claim or purpose in one sentence. Cite line range (e.g., Lines 1–5).
2. SECTIONS: List the major structural divisions with their line ranges.
3. ATOMIC CONCEPTS (3–8 items): For each concept:
   - Name it with a short label
   - State the core claim it makes
   - Identify the supporting evidence (reasoning, example, data, API, code)
   - Cite the exact line range in the source
4. ANTI-PATTERNS (if present): Note what the document says NOT to do, with line citations.
5. EXTERNAL CONNECTIONS: What prior knowledge or related concepts does this connect to?
   Classify each connection as: supplement / contradiction / causation / extension / analogy

Use this format for each concept:
---
Concept: [Label]
Claim: [What is asserted]
Evidence Type: [reasoning | code_example | data | api | analogy]
Evidence Detail: [Specifics]
Source Lines: [X, Y] or [X–Y]
---
```

**Step 1.3 — Build the deconstruction object** (keep it in working memory for Stage 2):

```
{
  "file_path": "docs/raw/<filename>",
  "total_lines": <N>,
  "thesis": "<one-sentence thesis>",
  "thesis_lines": [<start>, <end>],
  "sections": [
    { "title": "<section>", "line_range": [<start>, <end>] }
  ],
  "concepts": [
    {
      "label": "<label>",
      "claim": "<claim>",
      "evidence_type": "<type>",
      "evidence_detail": "<detail>",
      "source_lines": [<line>, ...]
    }
  ],
  "anti_patterns": ["<pattern 1>", "<pattern 2>"],
  "external_connections": [
    { "relation": "<supplement|contradiction|causation|extension|analogy>", "concept": "<name>", "context": "<why>" }
  ]
}
```

---

## Stage 2: Generate Leaf Note JSON

**Goal:** Produce the note file at `docs/notes/<slug>.json`.

### ID & Slug Generation

- **ID format:** `note_<6-char hash of file path>_<YYYYMMDD>`
  - Hash: take first 6 characters of the hex MD5 of `file_path` (compute deterministically; if no tool available, use first 6 chars of a lowercase base-36 encoding of the filename without extension)
- **Slug:** kebab-case of the note title, max 60 chars, ASCII only
- **Output file:** `docs/notes/<slug>.json`

### Note JSON Schema

Produce a JSON object with this exact structure:

```json
{
  "id": "note_<6char>_<YYYYMMDD>",
  "title": "<Descriptive title capturing the core concept>",
  "abstract": "<Single sentence: the most important thing to remember about this topic>",
  "source": {
    "input_path": "docs/raw/<filename>",
    "line_range": [<first_line>, <last_line>],
    "checksum": "<first 8 chars of filename MD5 or file size as fallback>"
  },
  "content": {
    "core_claims": [
      {
        "claim": "<Precise statement of what the source asserts>",
        "evidence": {
          "type": "<reasoning | code_example | data | api | analogy>",
          "description": "<Explanation of how the evidence supports the claim>"
        },
        "source_lines": [<line_a>, <line_b>]
      }
    ],
    "refinement": {
      "summary": "<2–3 sentences: the 'so what?' — practical implication or mental model to keep>",
      "anti_patterns": [
        "<Specific wrong approach or common mistake to avoid>"
      ]
    },
    "hooks": [
      {
        "relation": "<supplement | contradiction | causation | extension | analogy>",
        "target_concept": "<Name of the related concept or note>",
        "context": "<Why this connection matters>"
      }
    ]
  },
  "metadata": {
    "created_at": "<ISO 8601 timestamp>",
    "updated_at": "<ISO 8601 timestamp>",
    "domain": ["<primary domain>", "<secondary domain>"],
    "confidence": <0.0–1.0>,
    "status": "active"
  }
}
```

### Quality Rules for Leaf Notes

- `abstract` must be **one sentence only** — the single most important takeaway.
- `core_claims` should have **3–6 entries** — one per atomic concept from Stage 1.
- Each `claim` must be a standalone assertion (readable without the source).
- `evidence.type` must be one of: `reasoning`, `code_example`, `data`, `api`, `analogy`.
- `source_lines` must reference actual line numbers from the source file.
- `refinement.summary` captures the practical "so what?" — what would a skilled practitioner do differently after reading this?
- `anti_patterns` captures what NOT to do (critical for retention — humans learn well from negative examples).
- `hooks` must have **at least 1 entry**; aim for 2–3. These become graph edges in the knowledge forest.
- `confidence` reflects how clearly the source makes its case (0.9+ for well-evidenced claims; 0.6–0.8 for speculative content).

---

## Stage 3: Generate Review Card JSON

**Goal:** Produce the card file at `docs/note-cards/<slug>.json`.

Cards are attached to a note, not independent. Generate **3–5 cards** per note. Use a mix of card types to test from different angles.

### Card Types

| Type               | When to Use                    | Tests                                     |
| ------------------ | ------------------------------ | ----------------------------------------- |
| `qa`               | Conceptual understanding       | Can the learner explain the idea?         |
| `fill_in_blank`    | Key syntax, patterns, formulas | Can the learner recall the exact form?    |
| `error_correction` | Anti-patterns from Stage 1     | Can the learner spot and fix wrong usage? |

### Card JSON Schema

````json
{
  "note_id": "<same id as the leaf note>",
  "note_title": "<same title as the leaf note>",
  "source_trace": {
    "input_path": "docs/raw/<filename>",
    "line_range": [<first_relevant_line>, <last_relevant_line>]
  },
  "cards": [
    {
      "card_id": "card_<2-char-index><1char-type>_<YYYYMMDD>",
      "type": "qa",
      "question": "<Realistic question a teacher would ask — situational, not definitional>",
      "answer": "<Concise, precise answer>",
      "explanation": "<Why this answer is correct; the underlying reasoning>",
      "source_lines": [<line_a>, <line_b>]
    },
    {
      "card_id": "card_<2-char-index><1char-type>_<YYYYMMDD>",
      "type": "fill_in_blank",
      "template": "<Statement with ___________ for the key term or pattern>\n```language\n<code with blank if relevant>\n```",
      "answer": "<Exact fill-in>",
      "explanation": "<Why this specific form is required>",
      "source_lines": [<line_a>, <line_b>]
    },
    {
      "card_id": "card_<2-char-index><1char-type>_<YYYYMMDD>",
      "type": "error_correction",
      "code_snippet": "<Broken or incorrect code/statement>",
      "question": "<What is wrong with the above? What will happen at runtime?> ",
      "answer": "<Correct version or explanation of the bug>",
      "explanation": "<Root cause; what rule was violated>",
      "source_lines": [<line_a>, <line_b>]
    }
  ]
}
````

### Card ID Format

`card_<index><type_letter>_<YYYYMMDD>` where:

- `index` = `a1`, `a2`, `a3` ... (a=first card, b=second, ...)
- `type_letter` = `q` for qa, `f` for fill_in_blank, `e` for error_correction

Example: `card_a1q_20260422`, `card_b2f_20260422`, `card_c3e_20260422`

### Quality Rules for Cards

- Questions must be **situational**, not definitional. Bad: "What is shallowRef?" Good: "You have a 100k-row dataset causing lag — which Vue API should you switch to first?"
- `fill_in_blank` templates must have the answer be **a single precise term or code fragment**, not a paragraph.
- `error_correction` cards must use real broken code (from anti-patterns in Stage 1 when possible).
- Every card must have `source_lines` pointing to the evidence in the original file.

---

## Stage 4: Conflict Check & Save

### 4.1 — Scan Existing Notes

Before saving, use `file_search` to list existing files in `docs/notes/`. For each existing note that shares a domain tag with the new note:

- Skim its `content.hooks` and `content.core_claims` fields.
- If a claim in the new note **contradicts** an existing claim, flag it.

**Conflict flag format (print to user before saving):**

```
⚠️  CONFLICT DETECTED
New claim:     "<new claim>"
Existing note: docs/notes/<existing-slug>.json
Existing claim: "<existing claim>"
Action options:
  [1] Keep both (mark new note as contradicting existing)
  [2] Update existing note (replace old claim)
  [3] Merge (add nuance to both)
  [4] Skip saving (discard new note)
```

Wait for user to choose before proceeding. If no conflicts, continue automatically.

### 4.2 — Save Files

Use `create_file` to write both output files:

1. `docs/notes/<slug>.json` — the leaf note
2. `docs/note-cards/<slug>.json` — the review cards

If files already exist (re-ingesting), inform the user and ask whether to overwrite.

### 4.3 — Update the Index

Append an entry to `docs/notes/index.json` (create it if missing):

```json
{
  "notes": [
    {
      "id": "<note_id>",
      "title": "<title>",
      "slug": "<slug>",
      "domain": ["<domain>"],
      "abstract": "<abstract>",
      "source_path": "docs/raw/<filename>",
      "created_at": "<timestamp>"
    }
  ]
}
```

If the file exists, read it, append the new entry, then write it back.

---

## Processing Multiple Files

If the user provides a directory or multiple files:

1. List all `.md` files in `docs/raw/` using `file_search`.
2. Process each file through all four stages sequentially.
3. After each file, print: `✅ Processed: <filename> → docs/notes/<slug>.json + docs/note-cards/<slug>.json`
4. After all files: print a summary table.

---

## File & Directory Conventions

```
docs/
  raw/                  ← Source Markdown files (immutable, never modify)
  notes/
    <slug>.json         ← Leaf note JSON (one per source section/concept)
    index.json          ← Catalog of all notes
  note-cards/
    <slug>.json         ← Review cards JSON (one per leaf note)
```

---

## Complete Example

### Input (`docs/raw/vue-performance.md`, lines 1–22)

```markdown
减少大型不可变数据的响应性开销
Vue 的响应性系统默认是深度的...
```

### Deconstruction Output (Stage 1 internal result)

```
Thesis: Vue's deep reactivity creates measurable overhead for large datasets; shallowRef/shallowReactive are the escape hatch.
Concepts:
  1. Deep reactivity overhead (Lines 1–3) — reasoning evidence
  2. shallowRef / shallowReactive API (Line 5) — api evidence
  3. Immutable update pattern required (Lines 8–20) — code_example evidence
Anti-patterns:
  - shallowArray.value.push(newObject)  [Line 10]
  - shallowArray.value[0].foo = 1       [Line 14]
```

### Leaf Note Output (`docs/notes/vue-shallow-reactivity-optimization.json`)

```json
{
  "id": "note_3f2a1b_20260422",
  "title": "Vue Shallow Reactivity Optimization for Large Immutable Data",
  "abstract": "When Vue's deep reactivity causes performance issues with large datasets, switch to shallowRef/shallowReactive and treat nested objects as immutable — updating by replacing the root reference.",
  "source": {
    "input_path": "docs/raw/vue-performance.md",
    "line_range": [1, 22],
    "checksum": "a1b2c3d4"
  },
  "content": {
    "core_claims": [
      {
        "claim": "Vue's default deep reactivity tracks every property access via Proxy, causing measurable overhead at 100k+ accesses per render.",
        "evidence": {
          "type": "reasoning",
          "description": "Each property access triggers Proxy's dependency-tracking trap, multiplying cost linearly with data depth and size."
        },
        "source_lines": [1, 3]
      },
      {
        "claim": "shallowRef() and shallowReactive() are the official escape hatches: they make only the top-level property reactive.",
        "evidence": {
          "type": "api",
          "description": "Vue's built-in shallow API family skips deep traversal."
        },
        "source_lines": [5]
      },
      {
        "claim": "Using shallow APIs requires treating all nested objects as immutable — triggering updates only by replacing the root reference.",
        "evidence": {
          "type": "code_example",
          "description": "shallowArray.value = [...shallowArray.value, newObject] triggers; .push() does not."
        },
        "source_lines": [8, 14, 16, 18]
      }
    ],
    "refinement": {
      "summary": "When profiling reveals Vue reactivity as a bottleneck on large lists or deeply nested objects, shallowRef is the targeted fix. The trade-off is disciplined immutable update patterns (spread/replace instead of mutation) — essentially the same contract as React's useState. Combine with libraries like Immer for ergonomic immutable updates at scale.",
      "anti_patterns": [
        "Calling shallowArray.value.push(x) — mutation bypasses the shallow setter; view does not update.",
        "Directly mutating a nested property: shallowArray.value[0].foo = 1 — same issue, silently broken."
      ]
    },
    "hooks": [
      {
        "relation": "supplement",
        "target_concept": "Vue Reactivity System (Proxy vs Object.defineProperty)",
        "context": "Explains why deep reactivity has a cost — every property access hits a Proxy trap."
      },
      {
        "relation": "contradiction",
        "target_concept": "Vue ref auto-unwrapping in Composition API",
        "context": "shallowRef does NOT deep-unwrap nested refs; explicit .value access is always required."
      },
      {
        "relation": "extension",
        "target_concept": "Immer (immutable state library)",
        "context": "Immer's produce() provides ergonomic immutable update patterns compatible with shallowRef."
      }
    ]
  },
  "metadata": {
    "created_at": "2026-04-22T10:00:00Z",
    "updated_at": "2026-04-22T10:00:00Z",
    "domain": ["Frontend Development", "Vue.js", "Performance Optimization"],
    "confidence": 0.95,
    "status": "active"
  }
}
```

### Review Cards Output (`docs/note-cards/vue-shallow-reactivity-optimization.json`)

````json
{
  "note_id": "note_3f2a1b_20260422",
  "note_title": "Vue Shallow Reactivity Optimization for Large Immutable Data",
  "source_trace": {
    "input_path": "docs/raw/vue-performance.md",
    "line_range": [5, 20]
  },
  "cards": [
    {
      "card_id": "card_a1q_20260422",
      "type": "qa",
      "question": "Your Vue 3 app renders a 100,000-row table. Profiling shows the reactivity system is the bottleneck. Which API do you switch to, and what contract does it impose?",
      "answer": "Switch to shallowRef (or shallowReactive). The contract: treat all nested objects as immutable — update by replacing the root reference, never by mutating in place.",
      "explanation": "shallowRef skips deep Proxy tracking, eliminating per-property overhead. The trade-off is that mutations to nested objects won't trigger reactivity — only root replacement does.",
      "source_lines": [5, 8]
    },
    {
      "card_id": "card_b2f_20260422",
      "type": "fill_in_blank",
      "template": "To add an item to a shallowRef-wrapped array `arr` and trigger a view update, you must write:\n```javascript\narr.value = ___________\n```",
      "answer": "[...arr.value, newItem]",
      "explanation": "Only reassigning arr.value triggers shallowRef's setter. Mutation methods like push() bypass the reactive setter and the view will not update.",
      "source_lines": [14, 16]
    },
    {
      "card_id": "card_c3e_20260422",
      "type": "error_correction",
      "code_snippet": "const state = shallowRef({ list: [] });\nstate.value.list.push('new item');\n// Expected: view updates",
      "question": "What is wrong with this code? What will happen at runtime?",
      "answer": "The view will NOT update. push() mutates the nested array in place, but shallowRef only tracks changes to state.value itself — not changes inside it.",
      "explanation": "Correct approach: state.value = { ...state.value, list: [...state.value.list, 'new item'] }. Always replace the root reference to trigger shallow reactivity.",
      "source_lines": [16, 18]
    }
  ]
}
````

---

## Checklist Before Saving

Before writing any file, verify:

- [ ] `id` follows `note_<6char>_<YYYYMMDD>` format
- [ ] `abstract` is exactly one sentence
- [ ] All `source_lines` reference real line numbers from the source
- [ ] `hooks` has at least one entry
- [ ] `cards` has 3–5 items with mixed types (at least one `qa`)
- [ ] No direct API calls were made — all work done with Claude's native tools (`read_file`, `file_search`, `create_file`)
- [ ] `docs/notes/index.json` updated
