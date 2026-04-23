# Run Report Template

Use this template after each run for deterministic handoff.

## Success Payload

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
    "conflict_gate": "pass"
  }
}
```

## Failure Payload

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

## Notes

- Keep payload concise and machine-readable.
- Do not include unrelated diagnostics.
