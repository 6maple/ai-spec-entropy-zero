# Phase 1 Proposal 01 — Engineering Baseline & Authoritative Context

**Type**: Cross-cutting / read-first  
**Primary spec**: `工作台/项目文档/phase-1/spec-design.md` (single source of truth for Phase 1 product scope)  
**Engineering rules**: `projects/entropy-zero/CLAUDE.md`

---

## Why This Proposal Exists

When driving implementation with OpenSpec, **every change** should assume the same ground rules. This file is intentionally **small**: it avoids duplicating the full product spec while giving models and humans a **stable preamble** before opening Proposals 02–04.

**Rule of thumb for proposal size**: one OpenSpec *change* should be **implementable in one focused pass** (roughly a PR-sized slice). Baseline docs stay **1–3 pages**; feature proposals stay **3–8 pages** with clear boundaries and explicit non-goals.

---

## Authoritative Scope

- Phase 1 is defined end-to-end in **spec-design.md**. If anything conflicts, **spec-design.md wins**.
- Application root: **`projects/entropy-zero/`** (frontend, backend, `database/migrations/`).

---

## Toolchain (Non-Negotiable)

| Layer | Requirement |
|-------|----------------|
| Frontend | **pnpm**, Node **20+** |
| Backend | **Python 3.12**, **uv** (`uv sync`, `uv run …`) |
| Local data | **PostgreSQL** + **Redis** via local `.env` (never commit secrets) |
| Production | **Vercel** + **Supabase** (+ Upstash Redis when used); no hardcoded prod credentials in source |

---

## Product Constraints (Summary)

- **Chinese-only UX copy** by default; **i18n ready** but ship **zh-CN only** (no English locale bundles as default deliverable). Details: `CLAUDE.md` → Important Constraints.
- **Markdown ingestion = `.md` file upload only** (multipart); no JSON body for raw content, no large in-app Markdown paste-to-save.
- **No real outbound LLM HTTP calls** in Phase 1; processing uses a **replaceable non-LLM processor** (rules / internal placeholder). Aligns with project policy: do not implement actual vendor API client code for AI yet.
- **Mock policy**: avoid unnecessary mocks; any required mock must be **registered** in `CLAUDE.md` Mock registry for audit/removal.
- **Minimal blast radius**: change only modules/functions required for the current task; shared changes must not break unrelated callers (see `CLAUDE.md`).

---

## OpenSpec Usage Hint

- Map **Proposal 01** to a short “project context” artifact or paste it at the top of each change’s `design.md` if your OpenSpec template has no global context slot.
- **Proposals 02–04** map to **separate OpenSpec changes** (recommended kebab names in table below).

| Proposal file | Suggested OpenSpec change id |
|---------------|------------------------------|
| `phase-1-propose-02.md` | `phase-1-backend-ingest-orchestration` |
| `phase-1-propose-03.md` | `phase-1-frontend-shell-ingest-ui` |
| `phase-1-propose-04.md` | `phase-1-notes-cards-review` |

---

## Dependencies Between Proposals

```
  01 (baseline, no code)
       │
       ▼
  02 (backend ingest + tasks API)
       │
       ├──► 03 (frontend shell + /upload /raw /tasks)
       │
       └──► 04 (notes, cards, review) — requires persisted notes/cards from 02’s processor path
```

Proposal **04** may start UI scaffolding in parallel but **cannot be feature-complete** until Proposal **02** persists `notes` / `flashcards` per spec.

---

## Out of Scope (All Phase 1 Proposals)

- Real OpenAI / OpenRouter (or similar) integration
- WebSocket / SSE realtime (polling only unless spec changes)
- English locale as shipped default
- Broad refactors unrelated to the active change

---

## Done When

- Every OpenSpec change for Phase 1 references **this file + spec-design.md + CLAUDE.md** in its proposal or design preamble.
- No implementation contradicts the toolchain or environment table above.
