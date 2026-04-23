# Output Schemas

This file defines minimal output structures for deterministic implementation.

## Note File Schema (`docs/notes/<slug>.json`)

```json
{
  "id": "note_<shortid>_<yyyymmdd>",
  "title": "string",
  "source": {
    "input_path": "docs/raw/<file>.md",
    "line_range": [1, 100]
  },
  "content": {
    "core_claims": [
      {
        "claim": "string",
        "evidence": {
          "type": "reasoning|code_example|data|api|analogy",
          "description": "string"
        },
        "source_lines": [10, 20]
      }
    ],
    "refinement": {
      "anti_patterns": []
    },
    "hooks": [],
    "hooks_meta": {
      "no_hook_reason": "string"
    }
  }
}
```

## Card File Schema (`docs/note-cards/<slug>.json`)

```json
{
  "note_id": "note_<shortid>_<yyyymmdd>",
  "cards": [
    {
      "card_id": "card_<claim_index>_<yyyymmdd>",
      "claim_ref": "note_<shortid>_<yyyymmdd>:<claim_index>",
      "type": "qa|fill_in_blank|error_correction",
      "question": "string",
      "answer": "string",
      "explanation": "string",
      "source_lines": [10, 20]
    }
  ]
}
```

## Required Constraints

- `cards.length == content.core_claims.length`
- `claim_ref` is unique in one card file
- each `claim_ref` maps to exactly one claim index
- `hooks_meta.no_hook_reason` is required when `hooks` is empty
- do not include parent note fields

## Disallowed Patterns

- Fixed target counts for `anti_patterns`, `hooks`, or cards
- Card records without `claim_ref`
- Claim records without `source_lines`
