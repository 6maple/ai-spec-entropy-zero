# Quality Gates

Run gates after note and card generation. If a gate fails, rerun only the failing stage.

## Gate 1: Traceability

Pass when:

- every `core_claim` has evidence and `source_lines`
- every card has `source_lines`
- every card has valid `claim_ref`

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

Pass when:

- no unresolved contradiction exists between new claims and existing active notes, or
- contradiction is explicitly recorded and resolved per policy

See [Conflict Policy](./conflict-policy.md) for resolution actions.

## Check Order

Run in this order to minimize rework:

1. Traceability
2. Mapping Integrity
3. Dynamic Arrays
4. Structure Constraints
5. Conflict Gate

## Final Acceptance

All gates must pass.
If any gate fails after one targeted retry, stop and report precise failure reason and location.

Machine-readable result shape (recommended):

```json
{
  "status": "pass|fail",
  "failed_gate": "traceability|mapping-integrity|dynamic-arrays|structure-constraints|conflict-gate|null",
  "details": []
}
```
