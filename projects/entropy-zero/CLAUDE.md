# Entropy Zero - Engineering Guide (CLAUDE.md)

**Project**: Entropy Zero (熵减笔记)  
**Repo Root**: `projects/entropy-zero/`  
**Last Updated**: 2026-04-28

## 1) 项目当前状态（以代码为准）

- 已实现前后端基础链路：上传原文、创建处理任务、Worker 消费、Agent 生成 notes/cards、写库、前端展示与复习。
- Agent 已升级为**单次 LLM 调用主流程**，并支持：
  - 本地语言检测（`zh/en`）
  - claim_type 驱动分组
  - 文档级 `meta_tag`（`domain + topics`）
  - claim/question 协同输出后处理
- 数据库已包含扩展字段（迁移 `003_meta_tag_claim_type.sql`）：
  - `raw_knowledge.meta_tag_json`
  - `notes.claim_type`

## 2) 开发硬约束

### 2.1 用户文案语言

- 所有用户可见文案默认使用**简体中文**。
- 技术标识（路径、字段名、日志 key）可保持英文。

### 2.2 变更范围

- 只改当前任务相关模块，避免顺手重构无关代码。
- 若必须动共享模块，保证兼容调用方，并在提交说明影响面。

### 2.3 环境与密钥

- 严禁提交密钥、连接串、私有 token。
- 本地优先用 `backend/.env.local`（会覆盖 `.env`）。
- 生产配置仅通过平台环境变量注入。

### 2.4 Mock 与占位逻辑

- 非必要不加 mock。
- 若必须加临时占位，需在 PR 描述里写清“原因 + 删除条件”。

## 3) 核心架构（简版）

### 3.1 前端

- React + Vite，主要页面：
  - `frontend/src/pages/UploadPage.tsx`
  - `frontend/src/pages/RawLibraryPage.tsx`
  - `frontend/src/pages/NotesListPage.tsx`
  - `frontend/src/pages/ReviewPage.tsx`
- API 客户端在 `frontend/src/lib/api/`。

### 3.2 后端

- FastAPI 入口：`backend/app/main.py`
- 路由层：`backend/app/routers/`
  - `raw_knowledge.py`：上传与触发处理
  - `tasks.py`：任务进度
  - `notes.py`：笔记查询（含 `claim_type` 过滤）
  - `cards.py`：复习卡查询与评分
- Worker：`backend/app/worker.py`

### 3.3 Agent 链路

- 主控：`backend/app/agent/orchestrator.py`
- 路由：`backend/app/agent/llm_router.py`
- 本地语言检测：`backend/app/agent/local_lang.py`
- 结构化 schema：`backend/app/agent/structured_schemas.py`
- 后处理：`backend/app/agent/post_process.py`
- claim_type 映射：`backend/app/agent/claim_type_map.py`

### 3.4 数据层

- ORM：`backend/app/db/models.py`
- 连接：`backend/app/db/database.py`
- 迁移：`database/migrations/*.sql`

## 4) 本地开发最小流程

### 4.1 后端

```powershell
cd projects/entropy-zero/backend
uv sync
uv run uvicorn app.main:app --reload --port 8173
```

### 4.2 Worker

```powershell
cd projects/entropy-zero/backend
uv run python -m app.worker
```

### 4.3 前端

```powershell
cd projects/entropy-zero/frontend
pnpm install
pnpm dev
```

## 5) 常用检查命令

```powershell
# 后端单元测试
cd projects/entropy-zero/backend
uv run python -m unittest discover -s tests -q

# 后端启动冒烟
uv run python -c "from app.main import app; print('ok')"
```

## 6) 与当前实现一致的关键约定

- `ENTROPY_AGENT=1`：Worker 使用 Agent 流程。
- `ENTROPY_AGENT=0`：Worker 回退到 `run_deterministic_processor`（结构化错误返回）。
- Agent 成功结果由 `ProcessorSuccess` 承载：
  - `meta_tag`
  - `note_payloads`
  - `card_payloads`
- Worker 持久化时负责：
  - `raw_knowledge.meta_tag_json` 写入
  - `notes.claim_type` 写入
  - flashcards 与 point 的映射

## 7) 文档定位

- 面向新人/业务视角的完整说明：`projects/entropy-zero/project.md`
- 本文件仅保留工程约束与开发者操作指引。
