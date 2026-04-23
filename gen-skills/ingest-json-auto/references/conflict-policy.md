# Conflict Policy

## Scope

Resolve contradictions between newly generated claims and existing active notes.

## Detection

A conflict is detected when a new claim and an existing claim cannot both be true under the same context and time scope.

## Required Comparison Fields

- claim text
- source lines
- note metadata (date/domain/confidence if available)

## Resolution Actions

Use exactly one action per detected conflict:

1. `keep-both-with-contradiction`

- Keep both claims.
- Add a contradiction hook in new note.
- Mark conflict as unresolved but documented.

2. `update-existing`

- Update existing claim with new claim.
- Preserve audit trace in change log or metadata note.

3. `merge-with-qualification`

- Merge both into qualified statement with explicit conditions.
- Add rationale and source references.

4. `abort-save`

- Do not save new outputs for this file.
- Return conflict report for manual decision.

## Default Policy

If user does not specify policy, use `keep-both-with-contradiction` and document it.

## Output Contract

For each conflict, output:

- `new_claim`
- `existing_note_path`
- `existing_claim`
- `selected_action`
- `rationale`

If any conflict has no selected action, quality gate must fail.
