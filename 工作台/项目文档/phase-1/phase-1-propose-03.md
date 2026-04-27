# Phase 1 Proposal 03 — Frontend: App Shell, Navigation, Upload / Raw Library / Tasks

**Type**: Frontend / UX shell / ingest surfaces  
**Depends on**: `phase-1-propose-01.md`, **Proposal 02 APIs live or mocked only per CLAUDE.md registry**, `spec-design.md` §5, §8.0–8.3.2  
**Blocks**: None (can ship before 04); polish may wait for real API payloads from 02.

---

## Why

`spec-design.md` defines a **specific information architecture**: middle nav = **Home, Raw Library, Tasks, My Notes, Review**; right-side **primary button** = **Upload knowledge** → `/upload`. This change delivers **routing, layout, i18n wiring, and polling-based status UX** so users can operate the ingest loop without touching unrelated pages.

---

## What Changes (Capabilities)

### Capability A — `AppShell` + `TopNav`

- Sticky **56px** header per design tokens (`spec-design.md` §8.1–8.2).
- **Center links**: `/`, `/raw`, `/tasks`, `/notes`, `/review` with active state styles.
- **Right cluster**: **「上传知识」** primary button → `/upload`, then search icon (placeholder toast OK), optional notification placeholder, user menu (login/register when logged out).
- **Mobile**: hamburger drawer for center links; **keep Upload button visible** on small screens.

### Capability B — Pages `/upload`, `/raw`, `/tasks`, `/` (home)

- **`/upload`**: file dropzone + picker (`accept=".md"`), upload progress, success shows `raw_id` + CTA to `/raw`; failures retain file when still valid.
- **`/raw`**: table with filters, row actions (process / retry), detail drawer, polling while non-terminal rows exist (interval + timeout per spec §9.1).
- **`/tasks`**: list + filters + detail drawer; links to note when `note_id` present; retry aligned with backend contract from Proposal 02.
- **`/`**: dashboard cards: due review count, recent raw rows, recent tasks, shortcuts consistent with spec.

### Capability C — i18n (zh-CN only)

- All **user-visible** strings via i18n keys; **only `zh-CN` messages** checked in for Phase 1 (per `CLAUDE.md`).
- No English bundle as shipped default.

### Capability D — API client layer

- Typed clients: `rawApi`, `tasksApi` (and stubs for later `noteApi`, `cardApi` only if needed to compile—**prefer** leaving unused APIs unimported to avoid dead mocks).

---

## Non-Goals

- Note detail rendering, markdown pipeline, FSRS UI (Proposal 04).
- Real search backend.
- WebSocket updates.

---

## Acceptance (Frontend-Focused)

- Logged-in user can navigate all **spec-defined routes** without 404 from the router.
- Upload flow hits **`POST /api/raw/upload`** with multipart and surfaces Chinese errors from server or client validation.
- `/raw` and `/tasks` reflect backend states; polling stops at terminal or timeout.
- **No English** user-facing defaults; keys exist for all new strings added in this change.

---

## Suggested OpenSpec Artifacts

| Artifact | Purpose |
|----------|---------|
| `proposal.md` | IA + routes + why split upload vs library |
| `design.md` | Component tree, polling policy, auth-gated routes |
| `tasks.md` | Route table → layout → pages → i18n keys → API wiring |
| `specs/knowledge-ingest-ui/spec.md` (or similar) | Scenario-style UI requirements |

**Ideal size**: Keep **one OpenSpec change per proposal**; if the page set feels large, split **only** `/tasks` into a follow-up change **after** `/raw` ships—avoid splitting by arbitrary file count.

---

## Risks / Trade-offs

- **API not ready**: use **feature flags** or narrow loading states; **do not** add unregistered mocks—register in `CLAUDE.md` if unavoidable.
- **Duplicate status sources**: UI should prefer the **single contract** agreed in Proposal 02 `design.md` for “processing truth.”
