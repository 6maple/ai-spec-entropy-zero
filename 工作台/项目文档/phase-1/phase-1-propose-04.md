# Phase 1 Proposal 04 — Notes, Note Detail, Flashcards, Spaced Review (FSRS-lite)

**Type**: Domain UI + review APIs consumption  
**Depends on**: `phase-1-propose-01.md`, **Proposal 02** (persisted `notes`, `flashcards` from processor path), **Proposal 03** (routing shell optional but typical)  
**Primary spec**: `spec-design.md` §3.2.4–3.2.5, §7.3–7.4, §8.4–8.5

---

## Why

After ingest, Phase 1 must deliver **readable structured notes** (atomic points, code blocks, ToC) and **closed-book review** with **Again / Hard / Good / Easy** mapped to persisted **`review_logs`** and updated **`fsrs_state` / `next_review`**. This is a distinct **learning surface** change: it should not destabilize ingest APIs or global navigation.

---

## What Changes (Capabilities)

### Capability A — Notes list & detail

- **`GET /api/notes`** integration: filters per spec (`raw_id`, `tag`, `keyword` as available).
- **`/notes`**: card/table list, empty state in **Chinese** with CTA to `/raw` or upload.
- **`/notes/:noteId`**: layout per `spec-design.md` §8.4: header meta, `PointCard` list, **ToC** (H2/H3), sidebar stats (linked flashcard count), link back to originating raw if spec requires.
- **Markdown rendering** for point bodies with **syntax-highlighted code** and **CodeBlock** UX (mac dots, copy-to-clipboard with checkmark feedback, clipboard failure toast).

### Capability B — “Enter closed-book review” entry points

- From note detail sidebar: CTA navigates to `/review` with **`noteId` query** or equivalent filter contract documented in `design.md`.
- Global `/review` still works (all due cards).

### Capability C — Review session UI + API

- **`GET /api/cards/due`**: default `next_review <= now`; support `scope=global|note` + `note_id` when spec allows.
- **Review page**: hide answers initially; reveal answer; rating bar **1–4** with **Chinese labels** mapping to Again/Hard/Good/Easy semantics (keep numeric API as spec).
- **`POST /api/cards/{card_id}/review`**: send rating + `reviewed_at`; update local card queue optimistically or refetch per chosen pattern—document in `design.md`.

### Capability D — FSRS (simplified)

- Implement **minimal scheduling** sufficient for Phase 1 **but** persist shapes compatible with spec’s `fsrs_state` fields (`stability`, `difficulty`, `reps` or agreed subset).
- Explicitly document **limitations vs full FSRS** in `design.md` to set tester expectations.

### Capability E — Auth UX (if not already done)

- `/auth` flows or Supabase Auth UI wrapper—**only** if required to unblock gated routes; otherwise keep this proposal focused on notes/review and defer auth polish.

---

## Non-Goals

- Raw upload UI (Proposal 03).
- Queue / processor internals (Proposal 02).
- Full FSRS parity with Anki add-ons.
- Social / sharing / collaboration.

---

## Acceptance

- Opening a processed note shows **points + code blocks + ToC** without layout breakage on mobile (sidebar collapses per spec §5.7 / §8.0.6 patterns).
- `/review` shows **only due cards by default**; toggling filters behaves as documented.
- Each rating persists via API and **updates `next_review`** returned from server; `review_logs` row exists server-side.
- **No new English** UI strings; i18n keys added for any new copy.

---

## Suggested OpenSpec Artifacts

| Artifact | Purpose |
|----------|---------|
| `proposal.md` | User journeys: list → detail → review |
| `design.md` | Markdown AST/security notes, FSRS-lite formulas, query param conventions for scoped review |
| `tasks.md` | API wiring → components → a11y → E2E smoke checklist |
| `specs/knowledge-view/spec.md`, `specs/retention-layer/spec.md` | Scenario specs split if file size grows |

**Ideal size**: If `design.md` exceeds **~250 lines**, split FSRS-lite into `specs/fsrs-phase1/spec.md` and keep `design.md` as integration overview only.

---

## Risks / Trade-offs

- **XSS via Markdown**: sanitize / allowlist strategy must be decided once and referenced by tests.
- **FSRS-lite vs spec wording**: testers may expect Anki-identical intervals—mitigate with copy + `design.md` honesty.
- **Auth split**: if login is still partial, document **dev-only** bypass policy **only** if `spec-design.md` / `CLAUDE.md` allows; never widen bypass in production paths.
