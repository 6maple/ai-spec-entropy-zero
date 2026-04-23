# Entropy Reduction Rules

## Scope

Convert one raw markdown file into `1..N` note objects.

## Inputs

- One source file in `docs/raw/*.md`

## Outputs

- One or more note JSON objects for `docs/notes/*.json`

Each note must include at minimum:

- `id`
- `title`
- `source.input_path`
- `source.line_range`
- `content.core_claims`
- `content.refinement.anti_patterns`
- `content.hooks`
- `content.hooks_meta` (required when hooks is empty)

## Procedure

1. Parse source into sections with line ranges.
2. Extract atomic concepts per section.
3. Decide note partitioning:

- Single-theme with strong cohesion -> 1 note.
- Multi-theme or weak cohesion -> N notes by concept clusters.

4. For each note, generate `content.core_claims`:

- Each claim is a standalone atomic assertion.
- Each claim includes evidence and `source_lines`.

5. Generate dynamic arrays:

- `content.refinement.anti_patterns`: include only source-grounded mistakes; may be empty.
- `content.hooks`: include only high-confidence relations; may be empty.
- If `hooks` is empty, set `content.hooks_meta.no_hook_reason`.

6. Normalize claim structure:

- Keep claims atomic and standalone.
- Keep claim wording declarative and testable.
- Keep claim evidence tied to source lines.

## Data Rules

- Do not set fixed target counts.
- Do not add parent note abstraction.
- Keep all claims source-traceable.

## Coverage Rule

For each high-information section, map at least one `core_claim`.
If mapping fails, retry section deconstruction once before finalizing.

## Failure Output Contract

When coverage still fails after one retry, stop and report:

- `failed_stage`: `entropy-reduction`
- `reason`: concise sentence
- `missing_sections`: list of section titles or line ranges
- `next_action`: `manual-review-required`
