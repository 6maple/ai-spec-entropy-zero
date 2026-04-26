---
name: ingest-json-auto
description: 'Ingest raw markdown knowledge into entropy-reduced notes and claim-aligned review cards. Use this when users ask to ingest/process/convert docs/raw content into notes/cards, improve coverage, enforce claim-to-card 1:1 mapping, or avoid fixed-count anti_patterns/hooks/cards.'
argument-hint: 'Target raw markdown file path (for example: docs/raw/development.md)'
user-invocable: true
disable-model-invocation: false
---

# Ingest JSON Auto

## Outcome

This skill compiles raw markdown knowledge into durable learning assets:

- `docs/notes/*.json` with atomic `core_claims`
- `docs/note-cards/*.json` with strict 1:1 claim-to-card mapping

This skill only covers entropy reduction and card compilation.

## Learner Perspective — The Primary Quality Criterion

**Keep this perspective active for every output decision in this skill:**

> The output will be read by someone who studied this topic, then 2–4 weeks later opens the review card having forgotten most of it. That person has NO access to the source. They must be able to reconstruct complete understanding from the card alone.

This is the single criterion that subsumes all specific rules. When in doubt about any output decision — how long a claim should be, whether to include a code block, whether to split a claim — apply this test instead of looking for a matching rule.

**What this implies by direct reasoning (not by separate rules):**

- A one-sentence label fails the test. A learner cannot reconstruct mechanism or condition from it.
- Copying source text fails the test. Source text is written for readers who have context. It is often redundant, unstructured, or jargon-dense. It must be rewritten for a learner starting from zero.
- A card that lists the same items in both answer and explanation fails the test. The learner gets repetition, not depth.
- Two independently applicable techniques in one claim fails the test. A learner can be tested on either but the card tests neither in isolation.

**Self-test (mandatory before writing any claim or card):**

> “If I handed this card to someone who studied this topic 3 weeks ago and now remembers nothing, would they be able to reconstruct full, correct understanding after reading it once?”

If the answer is “maybe not” or “they would still need the source” — rewrite.

## When To Use

Use this skill when the user asks to:

- ingest markdown into structured notes/cards
- fix over-summarized notes with poor source coverage
- remove fixed-count behavior in arrays like `anti_patterns` and `hooks`
- enforce deterministic review-card coverage

Do not use this skill for UI tasks, app refactors, or unrelated data pipelines.

## Hard Constraints

1. `core_claims` are the minimal atomic unit.
2. Exactly one primary card per `core_claim`.
3. No optional extra cards.
4. A raw file may generate `1..N` notes based on topic cohesion.
5. No parent note layer.
6. If `hooks` is empty, write reason to `content.hooks_meta.no_hook_reason`.
7. Do not call external model APIs; use native agent tools only.

## Workflow

1. **Read [Entropy Reduction Rules](./references/entropy-reduction.md) and [Output Schemas](./references/output-schemas.md) in full before this step.** Run `python ./scripts/parse_source.py <source>` to get `parse` (section_ranges, code_fence_ranges — no line content). Use `parse` for section boundaries and code-fence checks. Section content is fetched per-section via `get_section.py` in Step 4. **Detect source language now** (see Language Policy in output-schemas.md) — store as `source_lang` and apply to all generated text fields.
2. Deconstruct into atomic concepts with traceable line ranges.
3. Split into `1..N` notes by topic cohesion, following the partitioning decision table in entropy-reduction.md.
4. Build note `core_claims` and `anti_patterns` per entropy-reduction.md procedure. Set `hooks: []` as placeholder for all notes — hooks are resolved after writing.
5. **Read [Card Generation Rules](./references/card-generation.md) in full before this step.** Build cards from `core_claims` with strict 1:1 mapping, following Question Rules exactly.
6. **Write note and card files using `create_file`.** Write all note files first, then all card files. Then run:
   ```powershell
   python ./scripts/update_index.py --source <source> --notes <note_paths> --cards <card_paths>
   ```
7. **Hooks Pass.** After index is updated, execute the Hooks Pass in entropy-reduction.md: scan cross-note relationships, then for each note run:
   ```powershell
   '<hooks_json>' | python ./scripts/update_note_hooks.py docs/notes/<slug>.json
   ```
8. **Clean up.** After all outputs are verified, scan the workspace for any files created during this run that are NOT in `docs/notes/`, `docs/note-cards/`, or `docs/index.json`. Delete them. Intermediate files left in the workspace — temp JSON, draft files, scratch outputs — will confuse users into thinking they are part of the knowledge base.

## Input Contract

- Primary input: one raw markdown path under `docs/raw/*.md`.
- If user does not provide file path:
  - ask for a target file, or
  - list available raw markdown files and request one selection.
- Process one file per run by default for higher quality control.

## Ambiguity Handling

- If section boundaries are unclear, prefer semantic cohesion over heading level.
- If evidence type is ambiguous, default to `reasoning` and explain briefly in evidence description.
- If conflict resolution action is unspecified, use default policy from [Conflict Policy](./references/conflict-policy.md).

For detailed rules, read:

- [Entropy Reduction Rules](./references/entropy-reduction.md)
- [Card Generation Rules](./references/card-generation.md)
- [Quality Gates](./references/quality-gates.md)
- [Conflict Policy](./references/conflict-policy.md)
- [Output Schemas](./references/output-schemas.md)

## Execution Checklist

Before saving outputs, verify all items:

- Input file is under `docs/raw/*.md` and is read-only.
- Notes output is `1..N` based on topic cluster analysis, without parent note. Do NOT default to 1 note per file.
- Every `core_claim` has evidence and `source_lines`.
- Every claim has exactly one card with unique `claim_ref`.
- Card type was determined by mechanical check (contrast markers → `error_correction`; code-block source lines → `fill_in_blank`; otherwise `qa`).
- `anti_patterns` was generated after an active source scan for signal words — not left empty by default.
- `hooks` was generated in the Hooks Pass (after writing files), scanning `docs/index.json` including this run's notes.
- `hooks` were populated in the Hooks Pass (Step 7), not during note generation. Note files were rewritten after the Hooks Pass if hooks were found.
- If `hooks` is empty, `content.hooks_meta.no_hook_reason` is present and non-empty.
- No fixed target counts are used for `anti_patterns`, `hooks`, or cards.
- Every note has `metadata.created_at` and `metadata.domain`.
- Every card file has `metadata` matching its corresponding note.
- Every card `question` was written from `topic` only; key content words from `assertion` do not appear in `question`.
- All generated text fields (`claim`, `evidence.description`, `question`, `answer`, `explanation`, `anti_patterns`) use the same language as the source document. Technical identifiers and code blocks are exempt.
- `docs/index.json` was updated after writing all output files.
- Every markdown text field passes the Typography Layout Self-Check in output-schemas.md: no wall-of-text paragraphs (max 3 sentences before `\n\n`), no semicolon-chained parallel items, code blocks flanked by `\n\n`, `claim` field contains no line breaks or lists.
- No temp, draft, or intermediate files remain in the workspace. The only new files from this run are in `docs/notes/`, `docs/note-cards/`, and `docs/index.json`.

## Minimal Invocation Examples

- "Ingest `docs/raw/development.md` into notes and note-cards with strict claim-card 1:1 mapping."
- "Re-ingest `docs/raw/development.md` and fix missing section coverage without introducing fixed-count hooks."

- If deconstruction coverage fails: rerun deconstruction once for missing sections only.
- If card mapping fails: regenerate cards only, keep notes unchanged.
- If conflict detected (Gate 5): apply [Conflict Policy](./references/conflict-policy.md) immediately — do not retry. Stop if no action is applied.

## Output Discipline

**Content generation** (`docs/notes/*.json`, `docs/note-cards/*.json`): use `create_file` directly. No scripts.

**Mechanical file operations**: use the provided Python scripts. Do not implement these manually:

| Operation         | Script                           | When                               |
| ----------------- | -------------------------------- | ---------------------------------- |
| Source parsing    | `./scripts/parse_source.py`      | Workflow Step 1                    |
| Section content   | `./scripts/get_section.py`       | Workflow Step 4 (once per section) |
| Anti-pattern scan | `./scripts/scan_antipatterns.py` | Workflow Step 4 (once per source)  |
| Index update      | `./scripts/update_index.py`      | Workflow Step 7 (after write)      |
| Hooks patch       | `./scripts/update_note_hooks.py` | Workflow Step 8                    |

All scripts run from project root. Do not create additional scripts, temp files, or intermediate files. Do not modify unrelated files.

## Minimal Invocation Examples

- "Ingest `docs/raw/development.md` into notes and note-cards with strict claim-card 1:1 mapping."
- "Re-ingest `docs/raw/development.md` and fix missing section coverage without introducing fixed-count hooks."
