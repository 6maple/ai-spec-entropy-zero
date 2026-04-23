# Acceptance Template

Use this checklist to validate one ingestion run.

## Input

- Target file: `docs/raw/<file>.md`

## Checks

1. Coverage

- High-information sections are represented in claims.
- Content is not limited to first sections only.

2. Claim Quality

- Every claim is atomic and standalone.
- Every claim has evidence and `source_lines`.

3. Card Mapping

- `primary_card_count == core_claim_count`
- Every card has unique `claim_ref`
- No extra cards

4. Dynamic Arrays

- No fixed-count logic in `anti_patterns`, `hooks`, or cards.
- If `hooks` is empty, `content.hooks_meta.no_hook_reason` is present.

5. Structure

- Notes count is `1..N` by cohesion.
- No parent note layer.

6. Conflict

- Contradictions handled with one selected action per conflict.

## Pass Condition

All checks pass.

## Fail Condition

Any check fails after one targeted retry.
Return failure payload defined in `run-report-template.md`.
