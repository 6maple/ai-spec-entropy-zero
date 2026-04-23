# E2E Execution Playbook

Follow this exact sequence in one run.

## Step 1: Read Source

- Read one file from `docs/raw/*.md`.
- Build section map with line ranges.

## Step 2: Deconstruct and Partition

- Extract atomic concepts.
- Partition into `1..N` notes by cohesion.
- Do not create parent note.

## Step 3: Generate Claims

- For each note, generate `core_claims`.
- Every claim must include evidence and `source_lines`.

## Step 4: Generate Dynamic Arrays

- Build `anti_patterns` from source-grounded mistakes only.
- Build `hooks` from high-confidence relations only.
- If hooks empty: set `content.hooks_meta.no_hook_reason`.

## Step 5: Generate Cards (Strict 1:1)

- For each claim index, generate one card.
- Set `claim_ref = <note_id>:<claim_index>`.
- Choose card type by rule in `card-generation.md`.

## Step 6: Run Gates

Run `quality-gates.md` in defined order.

- If one gate fails, rerun only that stage once.
- If still failing, stop with machine-readable failure output.

## Step 7: Handle Conflicts

- If contradiction appears, apply `conflict-policy.md`.
- If no resolution action selected, fail conflict gate.

## Step 8: Save Outputs

- Save notes to `docs/notes/`.
- Save cards to `docs/note-cards/`.
- Ensure final output satisfies `output-schemas.md`.

## Minimal Verification Checklist

- Source coverage is not limited to early sections only.
- Claim-card mapping is exact 1:1.
- No fixed-count behavior in dynamic arrays.
- `hooks_meta.no_hook_reason` exists when `hooks` is empty.
