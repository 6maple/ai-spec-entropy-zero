# Quality Gates

Run gates after note and card generation is complete. **Gate 5 (Conflict) runs during the Hooks Pass** — it is triggered only when a `contradiction` hook is produced, not before.

## Gate 1: Traceability

Pass when:

- every `core_claim` has evidence and `source_lines`
- every card has `source_lines`
- every card has valid `claim_ref`
- every note has `metadata.created_at` (ISO date) and `metadata.domain` (non-empty string)
- every card file has `metadata` matching the corresponding note's `metadata`

## Gate 2: Mapping Integrity

Pass when:

- `primary_card_count == core_claim_count`
- each claim appears exactly once in card refs
- no extra cards beyond mapped claims

## Gate 3: Dynamic Arrays

Pass when:

- no fixed-count logic is used for `anti_patterns`, `hooks`, or cards
- empty hooks include `content.hooks_meta.no_hook_reason`

## Gate 4: Structure Constraints

Pass when:

- output has no parent note layer
- source may produce `1..N` notes based on cohesion

## Gate 5: Conflict Gate

This gate is **not retriable**. Conflict is a semantic issue — rerunning the same stage will not change the result.

Pass when:

- no contradiction hook was generated, or
- every contradiction hook has been resolved via conflict-policy.md before reaching this gate

Procedure when a `contradiction` hook exists:

1. Immediately read [Conflict Policy](./conflict-policy.md).
2. Select exactly one resolution action per contradiction.
3. Execute the action (update claim, add qualification, or document as unresolved).
4. Only then does Gate 5 pass.

If a contradiction hook exists and no resolution action has been applied → **Gate 5 fails permanently. Stop and report.**

See [Conflict Policy](./conflict-policy.md) for resolution actions.

## Gate 6: Question Quality

Pass when, for every card:

- `question` does not contain the `answer` text verbatim or near-verbatim
- Reading the `question` alone does not allow the user to reconstruct the `answer`
- `question` follows the strategy for its claim type (definition / enumeration / application / causation / anti-pattern / comparison) as defined in card-generation.md

Fail action: regenerate the offending question only; do not touch notes or other cards.

## Check Order

Run in this order to minimize rework:

1. Traceability
2. Mapping Integrity
3. Dynamic Arrays
4. Structure Constraints
5. Conflict Gate
6. Question Quality

## Final Acceptance

All gates must pass.

- Gates 1–4, 6: if a gate fails, rerun only the failing stage once. If still failing, stop and report.
- Gate 5 (Conflict): not retriable — must be resolved via conflict policy before gate is evaluated. If unresolved after policy is applied, stop immediately.

### Success Payload

```json
{
  "status": "pass",
  "input_file": "docs/raw/<file>.md",
  "notes_written": ["docs/notes/<slug>.json"],
  "cards_written": ["docs/note-cards/<slug>.json"],
  "metrics": {
    "note_count": 1,
    "core_claim_count": 6,
    "primary_card_count": 6,
    "claim_card_coverage": 1.0
  },
  "gates": {
    "traceability": "pass",
    "mapping_integrity": "pass",
    "dynamic_arrays": "pass",
    "structure_constraints": "pass",
    "conflict_gate": "pass",
    "question_quality": "pass"
  }
}
```

### Failure Payload

```json
{
  "status": "fail",
  "failed_stage": "entropy-reduction|card-generation|quality-gates|conflict-resolution",
  "failed_gate": "traceability|mapping-integrity|dynamic-arrays|structure-constraints|conflict-gate|null",
  "input_file": "docs/raw/<file>.md",
  "reason": "short reason",
  "offending_fields": [],
  "next_action": "manual-review-required"
}
```
