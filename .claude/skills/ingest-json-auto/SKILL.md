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

1. Read target source markdown and build section map.
2. Deconstruct into atomic concepts with traceable line ranges.
3. Split into `1..N` notes by topic cohesion.
4. Build note `core_claims` from atomic concepts.
5. Build cards from `core_claims` with strict 1:1 mapping.
6. Run quality gates; rerun only failed stage.

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
- [E2E Execution Playbook](./references/e2e-execution-playbook.md)

## Execution Checklist

Before saving outputs, verify all items:

- Input file is under `docs/raw/*.md` and is read-only.
- Notes output is `1..N` based on cohesion, without parent note.
- Every `core_claim` has evidence and `source_lines`.
- Every claim has exactly one card with unique `claim_ref`.
- If `hooks` is empty, `content.hooks_meta.no_hook_reason` is present and non-empty.
- No fixed target counts are used for `anti_patterns`, `hooks`, or cards.

## Failure Handling

- If deconstruction coverage fails: rerun deconstruction once for missing sections only.
- If card mapping fails: regenerate cards only, keep notes unchanged.
- If conflict gate fails: follow [Conflict Policy](./references/conflict-policy.md).
- If any gate still fails after one targeted retry: stop and report exact failing gate and offending field.

Use standard failure payload from [Run Report Template](./references/run-report-template.md).

## Branching Logic

- If source is single-theme and strongly coherent: emit one note.
- If source has weakly related or multi-theme sections: emit multiple notes.
- If no high-confidence hooks: keep `hooks: []` and set `content.hooks_meta.no_hook_reason`.

## Completion Criteria

The run is complete only if all conditions pass:

- Every `core_claim` has evidence and source lines.
- Card coverage is exact: `primary_card_count == core_claim_count`.
- Every card has unique `claim_ref`.
- No fixed-count targets are used for `anti_patterns`, `hooks`, or cards.

Use standard success payload from [Run Report Template](./references/run-report-template.md).

## Output Discipline

- Keep outputs deterministic and schema-compliant per [Output Schemas](./references/output-schemas.md).
- Save only expected artifacts (`docs/notes/*.json`, `docs/note-cards/*.json`) unless user requests more.
- Do not modify unrelated files.

## Minimal Invocation Examples

- "Ingest `docs/raw/development.md` into notes and note-cards with strict claim-card 1:1 mapping."
- "Re-ingest `docs/raw/development.md` and fix missing section coverage without introducing fixed-count hooks."

## Acceptance Starter

Use [Acceptance Template](./references/acceptance-template.md) to validate one run end-to-end.
