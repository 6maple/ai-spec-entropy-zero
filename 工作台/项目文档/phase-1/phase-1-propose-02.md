# Phase 1 Proposal 02 — Backend: Raw Ingest, Processing Orchestration, Tasks API

**Type**: Backend / data / async orchestration  
**Depends on**: `phase-1-propose-01.md`, `spec-design.md` §6, §7.2, §7.5, state machine §6.3  
**Blocks**: Proposals 03 (frontend ingest UI), 04 (notes/cards/review need stored entities)

---

## Why

Phase 1 requires a **working pipeline**: upload `.md` → persist `raw_knowledge` → user triggers process → queue-backed execution → **non-LLM** processor writes **`notes` / `flashcards`** (or minimal summaries first, per spec) → terminal statuses with retry. The frontend cannot be completed without **stable API contracts** and **deterministic state transitions**.

---

## What Changes (Capabilities)

### Capability A — Raw knowledge HTTP API

- `POST /api/raw/upload`: **multipart/form-data` only**, field `file`, **`.md` only**, UTF-8 decode, size limits, safe `file_name`.
- `GET /api/raw`: list + filters (`status`, `keyword`, pagination).
- `GET /api/raw/{raw_id}`: detail + status + error summary + derived counts where spec requires.
- `POST /api/raw/{raw_id}/process`: state-gated transition to `processing`, enqueue job, return `task_id` (per spec).

### Capability B — Queue shell + worker boundary

- Minimal Redis client abstraction: **enqueue / dequeue / ack / nack** (local Redis dev, Upstash in prod).
- Worker execution path (separate process **or** bounded in-process consumer—**choose one** in `design.md` of the OpenSpec change; spec allows either if deployment-safe).

### Capability C — Pluggable processor (no external LLM)

- **Stable input contract**: `{ raw_id, user_id, content, file_name }`.
- **Stable output contract**: `note_payload`, `card_payloads`, `processing_summary`; errors as `error_code`, `error_message`.
- Implementation: **rules / deterministic placeholder** only—**no HTTP calls** to model vendors.

### Capability D — Task observability API

- `GET /api/tasks` (paged, filters).
- `GET /api/tasks/{task_id}` (detail for drawers).
- Align task rows with **`raw_knowledge` status** and/or `task_status` table if introduced—document single source of truth in the change `design.md` to avoid contradictory UI.

### Capability E — Auth boundary (minimal)

- Protected routes require `Authorization: Bearer <token>`; `user_id` from JWT `sub`—**never** trust client-supplied `user_id` for authorization.
- (Full signup/signin can ship in Proposal 04 if you split auth; if already present, only **harden** here.)

---

## Non-Goals

- FSRS scheduling logic (Proposal 04).
- Full Supabase Auth UI polish (can be 04).
- Replacing processor with real LLM.

---

## Data Model Touchpoints

- Reuse / extend `raw_knowledge`, `notes`, `flashcards`, `review_logs` per **`database/migrations/`** and `spec-design.md` §6.2.
- Optional `task_status` table: if added, migration + ORM + types must stay in sync with frontend `types`.

---

## Acceptance (Backend-Focused)

- Upload a valid `.md` → row `pending`; invalid extension / empty → `4xx` without row.
- Process from `pending` or `failed` → `processing` then terminal `processed` or `failed` with persisted error summary.
- No duplicate enqueue while `processing` (idempotency per spec).
- `GET /api/tasks` returns rows consistent with user-visible state on `/tasks` spec.
- **No outbound LLM client code** merged under this change.

---

## Suggested OpenSpec Artifacts for This Change

| Artifact | Purpose |
|----------|---------|
| `proposal.md` | Why / what / impact (short) |
| `design.md` | State machine, queue topology, processor contract, task vs raw status truth |
| `tasks.md` | Ordered checklist: migrations → routers → services → worker → tests |
| `specs/…/spec.md` | Scenario-style requirements per capability |

**Ideal size**: `proposal.md` **≤ ~120 lines**; `design.md` **≤ ~200 lines** unless queue topology is unusually complex; split extra detail into capability-specific spec files rather than one giant design.

---

## Risks / Trade-offs

- **Worker hosting on Vercel**: long-running consumers may be constrained—decide early in `design.md`.
- **Task list vs raw status**: if both exist, define **one** driving column for “processing” to avoid split-brain UX.
