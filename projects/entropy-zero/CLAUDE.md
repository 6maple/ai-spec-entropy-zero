# Entropy Zero - AI Agent Guidelines (CLAUDE.md)

**Project**: Entropy Zero (熵减笔记) - Phase 1  
**Architecture**: Full-stack Serverless (React 18 + FastAPI)  
**Repository**: `projects/entropy-zero/`

## 🎯 Project Overview

Entropy Zero is a knowledge management system that transforms chaotic notes into structured, atomic knowledge points with spaced-repetition flashcards. It reduces information entropy through AI-powered extraction and visual hierarchy.

**Key Principles**:
- Atomic knowledge points (self-contained)
- FSRS algorithm for optimal review scheduling
- Row-level security for data isolation
- Serverless-first architecture

---

## Important Constraints

These rules are as binding as functional requirements. Review them before changing code.

### 1. UI language (Chinese-only audience)

- The product has **only Chinese users**. All **user-facing** copy must be **Simplified Chinese** by default: labels, placeholders, validation messages, toasts, dialogs, empty states, and similar.
- Exceptions: technical identifiers, log field names, code symbols, and API paths may follow existing conventions; do **not** ship English as the default user-visible language.

### 2. Internationalization (i18n)

- The codebase **must support i18n** (e.g. message keys, a single source for UI strings; library choice follows project standards).
- **Current scope: Chinese only**. Maintain **only** a Chinese locale (e.g. `zh-CN`). Do **not** add English (or other non-Chinese) locale bundles as part of routine delivery, and do **not** use English as the default or sole fallback for user-visible text.
- Adding more languages must be a deliberate, scoped change—not an silent expansion.

### 3. Mocks and placeholders

- **Do not use mocks** (fake data, demo-only paths, dummy dependencies, etc.) unless **strictly necessary**.
- If a mock **is** required, **register it** in the **Mock / placeholder registry** below with: **path**, **reason**, and **removal plan or target phase** so it can be audited and removed later.
- Reviews should verify the registry matches the codebase.

#### Mock / placeholder registry (audit & cleanup)

| Location (path) | Reason | Removal plan / notes |
|-----------------|--------|----------------------|
| *None yet* | | |

### 4. Fallbacks and pointless defensive code

- **Avoid meaningless fallbacks**, especially when failure **cannot** happen by construction or contract—e.g. swallowing errors with defaults, hiding type mistakes, or masking exceptions that should propagate.
- Defensive code is appropriate at real boundaries: I/O, network, user input, third-party APIs.

### 5. Environment separation

- **Production**: **Vercel** (static frontend + serverless API) + **Supabase** (PostgreSQL, Auth, etc.); queue/redis per project config (e.g. **Upstash Redis**). Never hardcode production connection strings in source; use deployment env vars.
- **Local development**: **local PostgreSQL** and **local Redis** (see `.env` below). Keep secrets in local `.env` files; **do not commit** keys or private connection strings.
- When wiring config, DB clients, CORS, `VITE_API_BASE_URL`, etc., **explicitly distinguish** environments (e.g. `development` vs `production` or equivalent) so local and production behavior never mix or misconnect.

### 6. Scope of change (minimal blast radius)

- Change **only** what the current task requires. Do **not** refactor or touch unrelated modules “while you’re there.”
- **Examples**: when changing module **A**, do not change module **B**; when changing function **X**, do not change function **Y**—unless changing **Y** is **strictly necessary** for **A**, and that must be stated in the PR or change notes.
- If a shared module or shared function must change: **minimize surface area**, assess impact on **non-target** callers, and prefer narrow additions (new helpers, split interfaces, backward-compatible behavior) so other features keep working.

---

## 💻 Development Environment

### Prerequisites

```
Node.js 20+ (with pnpm)
Python 3.12 (with uv)
PostgreSQL 14+ (local development)
Redis 6+ (local development)
```

### Environment Configuration

**Local Development** (`.env` files):
- Frontend: `frontend/.env` - Supabase credentials (can use dev Supabase instance)
- Backend: `backend/.env` - Local PostgreSQL + Redis

**Environment Variables**:

```ini
# backend/.env (Local Development)
DATABASE_URL=postgresql://user:password@localhost:5432/entropy_zero
REDIS_URL=redis://localhost:6379
SUPABASE_URL=  # Optional: for Auth/Storage testing
SUPABASE_SERVICE_KEY=
AI_API_KEY=sk_your_openrouter_or_openai_key
PYTHONPATH=.
```

```ini
# backend/.env (Deployment to Vercel + Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
UPSTASH_REDIS_URL=https://your-upstash-url
AI_API_KEY=sk_...
PYTHONPATH=.
```

```ini
# frontend/.env (All environments)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=http://localhost:8000/api  # Local dev; Vercel in production
```

---

## 🚀 Quick Development Workflow

### Backend (Python + FastAPI)

```powershell
# Initial setup
cd backend
uv sync                                      # Install dependencies
createdb entropy_zero                        # Create local PostgreSQL database
psql entropy_zero < ../database/migrations/001_init.sql  # Run schema

# Development server
uv run uvicorn app.main:app --reload --port 8000

# API documentation
# Visit http://localhost:8000/docs (Swagger UI)
```

### Frontend (React + Vite)

```powershell
# Initial setup
cd frontend
pnpm install
cp .env.example .env                         # Configure .env

# Development server
pnpm dev
# Visit http://localhost:5173
```

### Database (Local PostgreSQL)

```sql
-- Initialize database once
CREATE DATABASE entropy_zero;

-- Connect and run migrations
psql entropy_zero < database/migrations/001_init.sql

-- Useful queries
-- List all tables:
\dt

-- Check RLS policies:
SELECT * FROM pg_policies;
```

---

## 📁 Project Structure & Key Files

```
entropy-zero/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Main routing entry
│   │   ├── pages/                  # HomePage, NoteDetailPage, ReviewPage, etc.
│   │   ├── components/
│   │   │   ├── layout/             # Header, Sidebar
│   │   │   └── note/               # PointCard, QACard, CodeBlock
│   │   ├── lib/
│   │   │   └── supabase.ts         # Supabase client (needs VITE_* env vars)
│   │   ├── hooks/
│   │   │   └── useAuth.ts          # Auth state management
│   │   └── types/
│   │       └── index.ts            # TypeScript types (4 main entities)
│   ├── vite.config.ts              # @tailwindcss/vite plugin, path alias
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + CORS + routers
│   │   ├── routers/
│   │   │   ├── raw_knowledge.py    # /api/raw - file uploads
│   │   │   ├── notes.py            # /api/notes - knowledge extraction
│   │   │   └── cards.py            # /api/cards - flashcards + review
│   │   ├── services/
│   │   │   └── ai_service.py       # LLM placeholder (NotImplementedError)
│   │   ├── db/
│   │   │   └── supabase.py         # Supabase client init
│   │   └── models/
│   │       └── schemas.py          # Pydantic + 6 main schemas
│   ├── api/
│   │   └── index.py                # Vercel Functions entry (Mangum)
│   ├── pyproject.toml              # uv dependencies
│   └── .env.example
│
├── database/
│   └── migrations/
│       └── 001_init.sql            # 4 tables (raw_knowledge, notes, flashcards, review_logs)
│                                     # With RLS policies + GIN indexes
│
└── vercel.json                      # Deployment: frontend CDN + /api/* → Python Functions
```

### Core Entity Types (TypeScript `src/types/index.ts`)

1. **RawKnowledge** - Uploaded Markdown files
   - Fields: `raw_id`, `user_id`, `file_name`, `content`, `status`, `created_at`
   - Status: `pending | processing | processed | failed`

2. **Note** - Processed knowledge + atomic points
   - Fields: `note_id`, `user_id`, `raw_id`, `title`, `abstract`, `tags`, `content_json`
   - `content_json`: Array of `Point` objects

3. **Flashcard** - Q&A for spaced repetition
   - Fields: `card_id`, `user_id`, `note_id`, `point_id`, `question`, `answer`, `fsrs_state`, `next_review`, `last_review`
   - `fsrs_state`: `{ stability, difficulty, reps }`

4. **ReviewLog** - User interaction records
   - Fields: `log_id`, `card_id`, `user_id`, `rating` (1-4), `elapsed_days`, `scheduled_days`, `review_at`

---

## 🔧 Common Development Tasks

### Adding a Backend Route

1. Create endpoint in `app/routers/{module}.py`
   - Use `HTTPException(status_code=501)` as placeholder
   - Define Pydantic schemas in `app/models/schemas.py`
   - Add full docstring with TODO comments

2. Update `app/main.py` if new router module
   ```python
   app.include_router(your_router.router, prefix="/api/your", tags=["Your"])
   ```

3. Test with `http://localhost:8000/docs` Swagger UI

### Adding Frontend Component

1. Create `.tsx` file in appropriate folder (`components/` or `pages/`)
2. Export as default function
3. Use Tailwind + shadcn/ui patterns
4. Add TypeScript props interface

### Database Schema Changes

1. Update SQL in `database/migrations/001_init.sql`
2. Reapply migration:
   ```sql
   psql entropy_zero < database/migrations/001_init.sql
   ```
3. Update TypeScript types in `frontend/src/types/index.ts`
4. Update Pydantic schemas in `backend/app/models/schemas.py`

---

## ⚙️ Architecture Decisions

### Database Strategy

| Environment | Database | Notes |
|---|---|---|
| **Local Dev** | PostgreSQL 14+ local | `createdb entropy_zero` + local migrations |
| **Testing** | PostgreSQL test instance | Same schema as production |
| **Production** | Supabase (PostgreSQL 16+) | Row-level security required |

All schemas use **identical structure** across environments. Environment detection happens in Python via env var checking.

### Authentication

- **Frontend**: Supabase Auth UI (placeholder, not yet integrated)
- **Backend**: JWT validation middleware (TODO)
- **Local Dev**: Can bypass auth for API testing (use `?user_id=test-uuid`)

### AI Service

Currently a **placeholder** (`NotImplementedError`). When implemented:
- Call OpenRouter/OpenAI API
- Extract knowledge points from Markdown
- Generate Q&A pairs
- Enqueue async tasks to Redis (local or Upstash)

### Async Task Queue

**Local Dev**: Can use Redis directly (`redis-cli`)  
**Production**: Upstash Redis via `UPSTASH_REDIS_URL`

---

## 🧪 Testing & Debugging

### Frontend

```powershell
# Type checking
cd frontend
pnpm tsc --noEmit

# Build check
pnpm build

# Linting
pnpm lint
```

### Backend

```powershell
cd backend

# Type hints
uv run python -m mypy app/

# Test imports
uv run python -c "from app.main import app; print('OK')"

# View SQLAlchemy/Supabase queries (optional logging)
# Set: export DEBUG=*
```

### Database

```sql
-- Check RLS is working
SET ROLE authenticated;
SELECT * FROM notes WHERE user_id != current_user_id;  -- Should return empty

-- Reset to superuser
RESET ROLE;
```

---

## 📦 Deployment Checklist

### Before Pushing to Vercel

1. ✅ All environment variables set in Vercel dashboard
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `UPSTASH_REDIS_URL`, `AI_API_KEY`

2. ✅ Database migrations applied in Supabase SQL Editor
   - Run `database/migrations/001_init.sql`
   - Verify RLS policies created

3. ✅ Frontend build succeeds
   ```powershell
   cd frontend && pnpm build
   ```

4. ✅ Backend API documented
   - Visit `/docs` endpoint on deployed URL

5. ✅ CORS origins updated if needed
   ```python
   # backend/app/main.py
   allow_origins=["https://your-domain.vercel.app"]
   ```

### Monitoring Post-Deployment

- Check Vercel logs: `vercel logs --tail`
- Monitor Supabase dashboard for connection issues
- Track Upstash Redis usage if applicable
- Verify API health: `GET https://your-api.vercel.app/health`

---

## 🚨 Common Pitfalls & Solutions

| Issue | Cause | Solution |
|---|---|---|
| `ModuleNotFoundError: No module named 'app'` | Wrong working directory | Run from `backend/` folder with `PYTHONPATH=.` |
| `SUPABASE_URL and SUPABASE_SERVICE_KEY must be set` | Missing `.env` file in backend | Copy `.env.example` and fill in credentials |
| Frontend 401 Unauthorized on API calls | Wrong `VITE_SUPABASE_ANON_KEY` | Use anon key, not service key (frontend uses anon) |
| RLS policies blocking all queries | Wrong user_id claim in JWT | Verify token has correct `sub` (user_id) claim |
| Flashcard `next_review` always null | FSRS algorithm not implemented | Currently endpoints return 501 - phase 2 |
| React Router not rendering pages | App.tsx BrowserRouter at wrong level | Ensure `<BrowserRouter>` wraps routes, not nested |

---

## 📚 Documentation Links

- **Requirements**: `工作台/项目文档/phase-1/Entropy Zero 需求-phase-1.md`
- **Technical Design**: `工作台/项目文档/phase-1/技术实现方案文档.md`
- **UI/UX Spec**: `工作台/项目文档/phase-1/design-ui.md`
- **DB Schema**: `database/migrations/001_init.sql`
- **API Endpoints**: `backend/app/routers/` (each router fully documented)

---

## 🎓 For New Contributors

When joining the project:

1. **Read this file** (you are here!)
2. **Set up local dev** following "Quick Development Workflow"
3. **Run migrations** against local PostgreSQL
4. **Start frontend + backend** servers
5. **Explore** `http://localhost:5173` and `http://localhost:8000/docs`
6. **Pick a TODO** from `backend/app/routers/` or `frontend/src/pages/`
7. **Ask questions** in comments - all endpoints clearly marked with TODO

---

## 📋 Implementation Priorities (Phase 1 → Phase 2)

### Phase 1 (Current)
- ✅ Project scaffold
- ⏳ Database CRUD operations
- ⏳ File upload endpoint
- ⏳ FSRS algorithm + review scheduling

### Phase 2 (Future)
- ⏳ AI service integration (OpenRouter)
- ⏳ Markdown → Knowledge points extraction
- ⏳ Q&A flashcard generation
- ⏳ Auth integration (Supabase Auth UI)

---

## 🔗 Quick Links

- **Supabase Console**: https://app.supabase.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **API Docs (Local)**: http://localhost:8000/docs
- **Frontend (Local)**: http://localhost:5173
- **Repository Root**: `d:/Workspace/ai-projects/llm-knowledge-lib`

---

**Last Updated**: 2026-04-27  
**Status**: Phase 1 Active Development
