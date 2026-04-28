# Entropy Zero 项目设计说明（新手友好版）

## 1. 这个项目是做什么的？

Entropy Zero（熵减笔记）是一个“把杂乱文档变成可复习知识卡片”的系统。  
你上传一篇 Markdown，系统会自动提炼知识点，生成笔记和复习卡，然后按复习节奏安排学习。

一句话理解：**输入原文，输出结构化知识和可复习卡片**。

---

## 2. 从用户视角看，系统做了什么？

用户通常只会经历这几步：

1. 上传 Markdown 文档
2. 点击“开始处理”
3. 系统后台异步运行（会显示任务进度）
4. 生成多个 Note（按知识类型分组）
5. 每个知识点生成一张 Flashcard
6. 在复习页面按到期卡片学习并评分

---

## 3. 系统总体架构

项目是前后端分离架构：

- 前端：React + Vite（页面交互、列表展示、复习流程）
- 后端：FastAPI（API、任务处理、数据读写）
- Worker：独立进程（从队列拿任务，调用 Agent，持久化结果）
- 数据库：PostgreSQL（本地或 Supabase）

核心目录：

- `frontend/`：前端页面与 API 调用
- `backend/app/`：后端业务代码
- `database/migrations/`：数据库迁移脚本

---

## 4. 关键数据模型（你需要记住的 4 张表）

### 4.1 `raw_knowledge`

存用户上传的原文。

- `raw_id`：原文 ID
- `content`：Markdown 内容
- `status`：`pending/processing/processed/failed`
- `meta_tag_json`：文档级语义标签（如领域、主题）

### 4.2 `processing_tasks`

记录处理进度和状态，供前端轮询展示。

- `current_step`
- `progress_percent`
- `status`

### 4.3 `notes`

存生成后的笔记（一篇原文可生成多个 note）。

- `note_id`
- `raw_id`
- `title/abstract`
- `content_json`（知识点数组）
- `claim_type`（本 note 的知识类型）

### 4.4 `flashcards`

存复习卡片（通常一个知识点对应一张卡）。

- `note_id`
- `point_id`
- `question/answer`
- `card_type`
- `claim_ref`

---

## 5. 详细处理流程（最重要）

下面是从“点击处理”到“写库完成”的真实链路。

### Step A：创建任务并入队

- API 在 `raw_knowledge` 写入状态
- 创建 `processing_tasks` 记录
- 把 `raw_id/task_id/user_id` 推入队列

### Step B：Worker 消费任务

`backend/app/worker.py` 从队列取任务，先锁定数据库行，防止并发冲突。

### Step C：选择处理器

通过 `ENTROPY_AGENT` 环境变量控制：

- `1`：使用 Agent（推荐，生产主路径）
- `0`：使用 deterministic fallback（仅返回结构化错误）

### Step D：Agent 单次 LLM 提取

Agent 主控在 `backend/app/agent/orchestrator.py`：

1. 本地检测语言（`local_lang.py`）
2. 构建 prompt（`extract_zh.jinja2` 或 `extract_en.jinja2`）
3. 通过 `llm_router.py` 发起**单次**模型调用
4. 使用 `structured_schemas.py` 校验输出 JSON
5. `post_process.py` 做确定性后处理：
   - 清洗 `meta_tag`
   - 校验/修正 `claim_type`
   - 修复 `p_id`
   - 拼接 `answer = claim + evidence`
   - 推断 `card_type`

### Step E：持久化

Worker 将结果写回数据库：

- `raw_knowledge.meta_tag_json`
- `notes`（含 `claim_type`）
- `flashcards`
- 更新任务状态为完成

---

## 6. Agent 输出结构（为什么稳定？）

系统要求模型按固定 JSON 返回：

- `meta_tag`：文档级标签
- `notes[]`：按 `claim_type` 分组
- `claims[]`：每条 claim 包含问题、证据、反模式等字段

然后由本地后处理统一收敛成 `ProcessorSuccess`，避免上游输出波动直接污染数据库。

这就是“模型负责语义，本地代码负责一致性”的设计原则。

---

## 7. 前端怎么消费这些数据？

前端通过 `frontend/src/lib/api/` 下的接口文件请求后端：

- 上传与触发处理：`rawApi.ts`
- 查看任务进度：`tasksApi.ts`
- 查看笔记：`notesApi.ts`
- 复习卡：`cardsApi.ts`

页面对应关系：

- 上传页：`UploadPage.tsx`
- 原文库：`RawLibraryPage.tsx`
- 笔记列表/详情：`NotesListPage.tsx` / `NoteDetailPage.tsx`
- 复习页：`ReviewPage.tsx`

---

## 8. 为什么要有 `claim_type` 和 `meta_tag`？

这两个字段是本次架构升级的核心。

- `claim_type`：让 note 的分组稳定可聚合（比如“概念定义”“反模式”）
- `meta_tag`：让文档有领域与主题维度，便于筛选和未来推荐

没有它们，系统只能“展示内容”；有了它们，系统才能“做知识组织”。

---

## 9. 错误处理与回退策略

### 9.1 LLM 相关错误

- 缺少 API Key、调用失败、JSON 解析失败时，返回结构化 `ProcessorError`
- Worker 将任务标记为 `failed`，并把 `error_summary` 写库

### 9.2 业务数据异常

- claim_type 非法：回落到安全默认类型
- 字段缺失：后处理补默认值
- 无有效 claims：返回 `NO_VALID_CONTENT`

---

## 10. 部署与环境

### 本地开发

- 数据库：本地 PostgreSQL
- 后端：`uvicorn`
- 前端：`pnpm dev`
- Worker：`python -m app.worker`

### 线上

- 前端/后端：Vercel
- 数据库：Supabase PostgreSQL
- 队列：Redis（如 Upstash）

密钥全部走环境变量，不写入代码仓库。

### 认证与环境切换（Supabase）

本项目使用 **Supabase Auth** 完成注册与登录，后端仅校验 JWT（`sub` 为用户 ID），不提供自建账号接口。

- **模式 A：本地 PostgreSQL/SQLite + Supabase Auth**  
  - 前端：`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`；`VITE_API_BASE_URL` 指向本地 API（如 `http://localhost:8173/api`）。  
  - 后端：按需设置 **`DATABASE_URL`**（SQLite 或本地 Postgres）；**`SUPABASE_URL`**、**`SUPABASE_SECRET_KEY`**（[`create_client` Data API](https://supabase.com/docs/reference/python/initializing)，无需单独 `*_DB_PASSWORD` 环境变量）、**`SUPABASE_JWT_SECRET`**（与控制台 JWT Signing Secret 一致，用于 Bearer）。  

- **模式 B：后端直连 Supabase 托管 Postgres**  
  - 按 [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) 从 Dashboard → **Connect** 复制 Postgres **连接字符串**，将 `postgresql://` 写成 `postgresql+asyncpg://` 后填入 **`DATABASE_URL`**（密码在该 URI 内，不要求额外环境变量）。  
  - **`SUPABASE_URL` + `SUPABASE_SECRET_KEY`** 仍按需用于服务端 Data API（`create_client`，与 Postgres 直连是两条通路）。  

- **模式 C：开发者令牌（仅联调）**  
  - 后端可设 `AUTH_MODE=dev_token` 与 `DEV_JWT_SECRET`；前端开发态可配置 `VITE_DEV_ACCESS_TOKEN`。  

**说明（与官方文档一致）**：经 **REST Data API** 访问数据时，`create_client` 仅需项目 **`SUPABASE_URL` + Secret**；本仓库 **`SQLAlchemy` 走的是 Postgres 协议**，需单独提供 **`DATABASE_URL`**（常为 Connect 里的完整 URI，密码在 URI 内）。二者不要混为一谈。

**排障**：受保护路由依赖 SQLAlchemy 时请配置 **`DATABASE_URL`**；仅用 `SUPABASE_JWT_SECRET` 不能充当数据库连接。401 时请核对 JWT Secret 与 Bearer。

---

## 11. 给新同学的阅读顺序（推荐）

如果你第一次接触项目，按这个顺序看：

1. `backend/app/main.py`（入口与路由挂载）
2. `backend/app/routers/raw_knowledge.py`（处理任务入口）
3. `backend/app/worker.py`（主流程调度）
4. `backend/app/agent/orchestrator.py`（Agent 主控）
5. `backend/app/agent/post_process.py`（数据收敛）
6. `backend/app/services/processor.py`（统一返回契约）
7. `backend/app/db/models.py`（数据库模型）
8. `frontend/src/pages/*.tsx`（页面如何消费数据）

读完这 8 步，你就能完整理解系统如何从“文档”变成“可复习知识”。

---

## 12. 当前实现边界（避免误解）

- 系统已能跑通上传→处理→入库→展示→复习主链路
- 不是通用知识图谱平台，当前目标是“个人知识提炼 + 复习”
- 中文场景优先，英文支持是保留能力，不是当前主业务

---

## 13. 小结

这个项目的本质不是“做一个聊天机器人”，而是做一个**可追踪、可落库、可复习的知识加工流水线**。

它的设计重点有三点：

1. **流程可观测**（任务状态、步骤进度可追踪）
2. **数据可落地**（所有输出都有数据库结构）
3. **结果可复用**（notes/cards 能在前端持续复习与筛选）

如果你理解了这三点，就理解了 Entropy Zero 的核心设计。
