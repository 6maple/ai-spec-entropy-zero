# Entropy Zero - Phase 1

**Status**: ✅ Project Initialized

全栈 Serverless 架构的知识管理与间隔复习应用。

## 📁 Project Structure

```
entropy-zero/
├── frontend/                 # React 18 + Vite 8 + Tailwind CSS v4
│   ├── src/
│   │   ├── components/       # UI components (layout, note, review)
│   │   ├── pages/            # Route pages
│   │   ├── lib/              # Utilities (Supabase client)
│   │   ├── hooks/            # React hooks (useAuth)
│   │   └── types/            # TypeScript types
│   └── .env.example          # Frontend environment template
├── backend/                  # Python 3.12 + FastAPI
│   ├── app/
│   │   ├── routers/          # API endpoints (raw, notes, cards)
│   │   ├── services/         # AI service (placeholder)
│   │   ├── db/               # Supabase client
│   │   └── models/           # Pydantic schemas
│   ├── api/
│   │   └── index.py          # Vercel Functions entry
│   └── .env.example          # Backend environment template
├── database/
│   └── migrations/
│       └── 001_init.sql      # PostgreSQL tables + RLS
└── vercel.json               # Deployment configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ with pnpm
- Python 3.12 with uv
- Supabase account

### Frontend Setup

```powershell
cd frontend
cp .env.example .env
# Edit .env with your Supabase credentials
pnpm install
pnpm dev
```

Visit `http://localhost:5173`

### Backend Setup

```powershell
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials
uv sync
uv run uvicorn app.main:app --reload
```

API docs at `http://localhost:8173/docs`

### Database Setup

1. Create a Supabase project
2. Run `database/migrations/001_init.sql` in SQL Editor
3. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to `.env` files

## 📝 Implementation Status

### ✅ Completed (Phase 1 Scaffold)

- Frontend project structure with React Router
- Component skeletons (PointCard, QACard, CodeBlock)
- Backend API routes (all endpoints return 501)
- Database schema with RLS
- TypeScript types matching DB schema
- Supabase client integration

### 🚧 TODO (Next Steps)

1. **Database Implementation**
   - Connect routes to Supabase
   - Implement CRUD operations
   - Add pagination support

2. **AI Service Integration** (Phase 2)
   - Implement markdown parsing
   - Generate knowledge points
   - Create Q&A flashcards
   - Integrate OpenRouter/OpenAI

3. **FSRS Algorithm**
   - Port FSRS logic to Python
   - Calculate next review dates
   - Handle rating submissions

4. **Frontend UI**
   - Markdown rendering (react-markdown)
   - Syntax highlighting (Prism.js/Highlight.js)
   - Review session flow
   - File upload interface

5. **Authentication**
   - Supabase Auth UI integration
   - Protected routes
   - JWT validation middleware

## 🔗 Key Routes

### Frontend
- `/` - Home (notes list)
- `/notes/:id` - Note detail
- `/review` - Review session
- `/upload` - Upload markdown
- `/auth/login` - Login page

### Backend API
- `GET /api/raw` - List raw knowledge
- `POST /api/raw` - Upload markdown
- `POST /api/raw/{id}/process` - Trigger AI processing
- `GET /api/notes` - List notes
- `GET /api/notes/{id}` - Get note detail
- `GET /api/cards?filter=today` - List flashcards
- `POST /api/cards/{id}/review` - Submit review

## 📦 Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 18, Vite 8, Tailwind CSS v4, shadcn/ui |
| Backend  | FastAPI, Python 3.12, Pydantic               |
| Database | Supabase (PostgreSQL 16+)                    |
| Auth     | Supabase Auth                                |
| Storage  | Supabase Storage                             |
| Queue    | Upstash Redis (future)                       |
| Deploy   | Vercel Functions                             |

## 🎯 Design Principles

- **Entropy Reduction**: Transform chaotic notes → structured knowledge
- **Atomic Knowledge**: Each point is self-contained
- **Visual Hierarchy**: Clear typography and spacing
- **FSRS Scheduling**: Evidence-based spaced repetition
- **Serverless First**: Zero infrastructure management

## 📄 License

MIT
