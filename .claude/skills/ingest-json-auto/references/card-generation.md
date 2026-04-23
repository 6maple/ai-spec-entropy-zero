# Card Generation Rules

## Scope

Generate review cards from note `core_claims` only.

## Invariant

Strict 1:1 mapping:

- one `core_claim` -> one primary card
- no missing card
- no duplicated claim card
- no optional extra card

## Procedure

1. Iterate claims in order.
2. For each claim, create one card with `claim_ref` (`note_id:claim_index`).
3. Assign card type:

- default `qa`
- `fill_in_blank` when claim depends on precise term, formula, or code form
- `error_correction` when claim anchors an anti-pattern

4. Fill card fields:

- `card_id`
- `claim_ref`
- `type`
- `question`
- `answer`
- `explanation`
- `source_lines`

Primary card required shape:

- `card_id`: stable and unique within file
- `claim_ref`: `note_id:claim_index`
- `type`: `qa` | `fill_in_blank` | `error_correction`
- `question`: concise, situational when possible
- `answer`: precise and directly gradable
- `explanation`: why answer is correct
- `source_lines`: one or more valid line numbers

## Determinism Rules

- Card count must equal claim count.
- `claim_ref` must be unique within a note card set.
- Every card must be directly traceable to claim source lines.

## Card ID Recommendation

Use deterministic IDs to reduce churn on re-ingest:

- `card_<claim_index>_<yyyymmdd>` or
- `card_<short-note-id>_<claim_index>`

## Failure Output Contract

When mapping integrity fails after one retry, stop and report:

- `failed_stage`: `card-generation`
- `reason`: concise sentence
- `unmapped_claim_refs`: list
- `duplicate_claim_refs`: list
- `next_action`: `manual-review-required`
