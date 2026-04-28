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

| Location (path)                                  | Reason                                                                                                                                                          | Removal plan / notes                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `backend/.env` · `ENTROPY_INLINE_QUEUE=1`        | 本地无 Redis 时在 API 进程内 `asyncio.create_task` 执行 `process_job`，便于 Windows / Playwright 验证                                                           | 接入 Upstash / 本地 Redis 后删除；不得用于生产  |
| `frontend/.env*.local` · `VITE_DEV_ACCESS_TOKEN` | Supabase 登录页未接好前，开发联调 Bearer                                                                                                                        | 登录流程完成后可改用真实 `session.access_token` |
| `app/services/processor.py`                      | 与 Agent 共用的 `ProcessorInput` / `ProcessorError` 等契约；`run_deterministic_processor` 不再产出占位数据，仅返回 `DETERMINISTIC_PROCESSOR_RETIRED` 等明确错误 | 无（保留契约供类型与受控回调查询）              |

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
VITE_API_BASE_URL=http://localhost:8173/api  # Local dev; Vercel in production
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
uv run uvicorn app.main:app --reload --port 8173

# 处理队列 Worker（需 REDIS_URL 或 UPSTASH_REDIS_URL；另开终端）
# uv run python -m app.worker

# 无 Redis 时本地验证：在 backend/.env 设置 ENTROPY_INLINE_QUEUE=1 与 DEV_JWT_SECRET（见 .env.example），
# 任务会在 API 进程内异步执行，无需单独 worker（勿用于生产）。

# API documentation
# Visit http://localhost:8173/docs (Swagger UI)
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

3. Test with `http://localhost:8173/docs` Swagger UI

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

| Environment    | Database                  | Notes                                      |
| -------------- | ------------------------- | ------------------------------------------ |
| **Local Dev**  | PostgreSQL 14+ local      | `createdb entropy_zero` + local migrations |
| **Testing**    | PostgreSQL test instance  | Same schema as production                  |
| **Production** | Supabase (PostgreSQL 16+) | Row-level security required                |

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

| Issue                                               | Cause                                | Solution                                           |
| --------------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| `ModuleNotFoundError: No module named 'app'`        | Wrong working directory              | Run from `backend/` folder with `PYTHONPATH=.`     |
| `SUPABASE_URL and SUPABASE_SERVICE_KEY must be set` | Missing `.env` file in backend       | Copy `.env.example` and fill in credentials        |
| Frontend 401 Unauthorized on API calls              | Wrong `VITE_SUPABASE_ANON_KEY`       | Use anon key, not service key (frontend uses anon) |
| RLS policies blocking all queries                   | Wrong user_id claim in JWT           | Verify token has correct `sub` (user_id) claim     |
| Flashcard `next_review` always null                 | FSRS algorithm not implemented       | Currently endpoints return 501 - phase 2           |
| React Router not rendering pages                    | App.tsx BrowserRouter at wrong level | Ensure `<BrowserRouter>` wraps routes, not nested  |

---

## � Testing & Debugging Best Practices

### Lessons from Agent Processing Pipeline Implementation (2026-04-27)

#### **1. Test Strategy: Start Small**

**错误实践**: 直接用完整文件（1000+行）测试复杂流程
**正确实践**: 使用分层测试策略
```
10行样本 → 100行样本 → 完整文件
```

**实战经验**:
- 小样本测试周期：10-30秒
- 完整文件测试周期：60-90秒
- 早期用小样本能快速定位80%的bug
- 完整测试留到架构验证完成后

#### **2. Diagnostic Logging: Preemptive is Better**

**关键原则**: 在关键数据流节点提前加日志，而不是事后补救

**必须记录的检查点**:
```python
# 数据转换节点
log.info(f"📊 输入: {len(input_items)} 个，输出: {len(output_items)} 个")

# 架构关键决策
log.info(f"🔀 生成了 {len(note_payloads)} 个 notes（期望: {expected_count}）")

# 性能瓶颈
start = time.time()
result = await expensive_operation()
log.info(f"⏱️ 操作耗时: {time.time() - start:.2f}秒")
```

**教训**: 我们创建了10+个临时诊断脚本才定位到根因，如果初始代码就有诊断日志，可节省70%的调试时间。

#### **3. Architecture Before Optimization**

**错误顺序**: 发现性能慢 → 立即优化并行化 → 发现输出错误 → 才发现架构设计缺陷

**正确顺序**:
1. ✅ 验证数据流正确性（单note vs 多notes）
2. ✅ 确认架构支持需求（`ProcessorSuccess`支持多笔记）
3. ✅ 端到端功能验证（6个bundles → 6个notes）
4. ✅ 性能优化（并行化、缓存等）

**实战案例**:
```
Bug链: API兼容 → Worker阻塞 → 性能慢 → 输出错误 → 架构单note限制
正确: 应先发现架构问题（单note设计），再做性能优化
```

#### **4. Performance Bottleneck Analysis**

**Worker性能剖析** (test_sample.md 2.75KB):
```
语言检测:      2秒   (1次LLM调用, 无法并行)
结构分析:      2秒   (1次LLM调用, 无法并行)
Claims提取:   10秒   (6次并行调用, 受最慢的限制)
Cards生成:    10秒   (6次并行调用)
数据库写入:    1秒
──────────────────────
总计:       ~27秒
```

**优化成果**:
- 串行实现：90秒
- 并行优化：60秒（3x提速）
- 瓶颈：LLM API延迟（1.5-3秒/次）

**进一步优化方向**:
- ✅ 已实现：ThreadPoolExecutor并行化（max_workers=6）
- 🔄 可选：orchestrator改为真async（避免阻塞事件循环）
- 🔄 可选：使用更快的模型（qwen-turbo vs qwen3.5-35b）
- 🔄 可选：增加并行度（max_workers=10-15）
- ⚠️ 限制：模型推理时间无法突破（1-2秒/次是底线）

#### **5. Temporary Files Management**

**清理原则**: 测试/诊断脚本应该在验证完成后立即删除

**应清理的临时文件**:
```
✓ check_*.py       # 诊断脚本
✓ test_*.py        # 临时测试脚本（保留正式的）
✓ diagnose_*.py    # 问题定位脚本
✓ __pycache__/     # Python缓存（216个目录！）
✓ *.db             # 废弃的SQLite文件
```

**应保留的工具**:
```
✓ test_upload.py   # 正式测试脚本
✓ verify_output.py # 输出验证工具
✓ clear_database.py# 数据库清理工具
```

#### **6. Bug Dependency Chain Awareness**

**实战案例**:
```
1. API兼容问题（DashScope参数错误）
   ↓ 导致
2. Worker无法完成处理
   ↓ 看起来像
3. 性能问题（实际是阻塞）
   ↓ 并行化后发现
4. 输出质量问题（1个note vs 6个）
   ↓ 深入分析发现
5. 架构设计缺陷（ProcessorSuccess单note限制）
```

**教训**: 
- 不要孤立地修复每个症状
- 寻找根本原因（root cause）
- 修复根因能同时解决多个症状

#### **7. Testing Environment Best Practices**

**环境配置检查清单**:
```bash
# 1. 数据库状态清晰
psql entropy_zero -c "SELECT COUNT(*) FROM notes;"

# 2. Redis队列干净
redis-cli LLEN entropy:process_jobs

# 3. Worker进程状态
ps aux | grep "app.worker"

# 4. 端口占用检查
netstat -ano | findstr :8173
```

**测试隔离原则**:
- 每次重要测试前清空数据库
- 确认Redis队列为空
- 确认只有一个Worker进程在运行
- 使用小样本避免浪费token

#### **8. Documentation During Development**

**不要做**: 事后整理大量散乱的笔记
**应该做**: 在关键决策点即时记录

**记录模板**:
```markdown
## 问题: [简短描述]
根因: [技术原因]
方案: [修复方法]
验证: [测试结果]
影响: [改动范围]
```

**本次实战**: 整个调试过程如果有即时记录，可避免：
- 重复尝试相同的诊断方法
- 忘记之前发现的线索
- 混淆不同版本的修复尝试

---

## �📚 Documentation Links

- **Requirements**: `工作台/项目文档/phase-1/Entropy Zero 需求-phase-1.md`
- **Technical Design**: `工作台/项目文档/phase-1/技术实现方案文档.md`
- **UI/UX Spec**: `工作台/项目文档/phase-1/design-ui.md`
- **DB Schema**: `database/migrations/001_init.sql`
- **API Endpoints**: `backend/app/routers/` (each router fully documented)
- **FSRS-lite (Phase 1)**: `docs/fsrs-phase1.md`（复习调度简化说明，与完整 FSRS 差异）

---

## 🎓 For New Contributors

When joining the project:

1. **Read this file** (you are here!)
2. **Set up local dev** following "Quick Development Workflow"
3. **Run migrations** against local PostgreSQL
4. **Start frontend + backend** servers
5. **Explore** `http://localhost:5173` and `http://localhost:8173/docs`
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
- **API Docs (Local)**: http://localhost:8173/docs
- **Frontend (Local)**: http://localhost:5173
- **Repository Root**: `d:/Workspace/ai-projects/llm-knowledge-lib`

---

**Last Updated**: 2026-04-27 (添加Agent处理管道测试经验)  
**Status**: Phase 1 Active Development - Agent Pipeline Validated
