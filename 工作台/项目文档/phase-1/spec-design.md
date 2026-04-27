# Entropy Zero Phase 1 全站规格设计（Spec Design）

## 1. 文档目标与范围

### 1.1 文档定位（单一权威来源）

- **本文档是 Phase 1 产品与实现的唯一权威规格**：范围、模块、API、界面、验收标准以本节及后续章节为准。
- **开发实施只需遵循本文档 + 仓库内代码约束（见 `projects/entropy-zero/CLAUDE.md`）**，无需再依赖 `工作台/项目文档/project.md` 或其它索引类文档。
- 历史资料（如 `Entropy Zero 需求-phase-1.md`、`技术实现方案文档.md`）若与本文冲突，**以本文为准**；细节已并入本文者不另维护平行需求。

### 1.2 仓库与代码路径

- 本产品中应用代码位于 monorepo 路径：**`projects/entropy-zero/`**（前端 `frontend/`、后端 `backend/`、数据库脚本 `database/migrations/` 等，与仓库实际目录一致）。
- 数据库初始化脚本：**`projects/entropy-zero/database/migrations/`**（如 `001_init.sql`，具体文件名以仓库为准）。
- OpenAPI/Swagger：本地开发时后端 **`http://localhost:8000/docs`**（实现完成后用于对照接口）。

本设计基于 `phase-1` 功能文档与当前项目约束，输出可直接落地的全站级方案，覆盖：
- 网站应包含的模块与边界
- 模块内功能点与模块间交互
- 前端实现方案（React 18 + Vite + Tailwind + shadcn/ui）
- 后端实现方案（FastAPI + PostgreSQL/Supabase + Redis/Upstash）
- 前后端 API 契约（含请求/响应/错误码/状态机）
- 关键界面与交互设计细则

Phase 1 明确约束：
- 必须完成“知识录入 -> 处理 -> 展示 -> 复习”主流程闭环
- **知识录入仅支持上传 Markdown 文件（`.md`）**：不提供站内 Markdown 文本编辑区、粘贴正文入库、或 JSON 直传正文等替代录入方式；用户须选择本地 `.md` 文件（可配合拖拽到上传区）。
- 处理链路需可运行、可观察、可重试
- **禁止实现真实外部大模型 HTTP 调用**：不得在代码中编写对 OpenAI / OpenRouter 等供应商的实际请求逻辑；处理链路使用 **规则实现或可替换的占位处理器（非真实 LLM）**，与既有「暂不实现 AI 调用模块真实 API」的项目约束一致。
- 数据必须入库，支持用户数据隔离（RLS/JWT/`user_id` 约束）

### 1.3 界面语言与国际化（与实现对齐）

- **仅中文用户**：用户可见文案（按钮、校验、Toast、对话框、空状态等）须为**简体中文**；技术标识、日志字段、URL 除外。
- **须支持 i18n 扩展**（如文案 key、`zh-CN` 资源）；**交付范围仅中文**，不得引入英文语言包作为默认交付物（细则见 `projects/entropy-zero/CLAUDE.md`）。

---

## 2. 产品目标与核心原则

## 2.1 产品目标
- 将用户上传的 Markdown 原始知识，转化为结构化笔记与 Q&A 复习卡
- 支持“默认仅看今日待复习卡片”的闭卷复习体验
- 为后续接入真实 AI 能力提供稳定可替换接口，不推翻 Phase 1 架构

## 2.2 核心原则
- 原子化：知识点是最小学习单元（Point）
- 可演进：processor 通过稳定契约可从 mock 替换为真实 AI
- 可观测：状态机全程可查（`pending -> processing -> processed|failed`）
- 数据隔离：所有实体以 `user_id` 为安全边界
- Serverless 优先：前后端部署与运行成本保持轻量

---

## 3. 全站模块设计

## 3.1 模块清单
1. **认证与账户模块（Auth）**
2. **知识录入模块（Manual Entry / Raw Knowledge）**
3. **知识处理编排模块（Processing Orchestration）**
4. **知识展示模块（Knowledge View）**
5. **复习计划与闭卷复习模块（Retention Layer）**
6. **任务进度与状态观测模块（Task Status）**
7. **系统基础模块（通用组件、搜索、通知、日志、错误处理）**

## 3.2 各模块功能与边界

### 3.2.1 认证与账户模块
**功能：**
- 邮箱注册（校验邮箱格式、密码>=8且含字母数字）
- 登录发放 JWT（24h，有效期内访问 API）
- 未认证访问数据接口返回 `401`
- 用户基础资料（昵称、头像）维护入口预留

**边界：**
- Phase 1 不引入 Refresh Token
- 可采用 Supabase Auth UI 或 FastAPI OAuth2 密码模式，但对业务 API 暴露统一 Bearer Token 语义

### 3.2.2 知识录入模块
**功能：**
- 仅通过 **上传 `.md` 文件** 录入（浏览器文件选择或拖拽文件至上传区；不接受非 `.md` 扩展名或空文件）
- 服务端从上传文件读取正文写入 `content`，`file_name` 取客户端文件名（或规范化为原始文件名）
- 入库到 `raw_knowledge`，初始状态 `pending`
- 列表/详情查询，支持按状态过滤
- 可选“上传后自动进入梳理”，默认关闭
- 支持批量选中后触发处理（可按条件搜索）

**边界：**
- 不做复杂格式转换，只保证从 `.md` 文件读取的 Markdown 原文可持久化
- 非法输入（非 `.md`、空文件、读文件失败、超限）必须失败并提示可重试；**不提供**“纯文本框录入 Markdown”作为 Phase 1 能力

### 3.2.3 知识处理编排模块
**功能：**
- 触发处理时进行状态校验与幂等保护
- 合法状态进入 `processing` 并入队
- 队列消费调用 mock processor，生成结构化产物
- 产物回写：`notes`、`flashcards`（至少可回写处理摘要）
- 失败回写 `failed` + `error_summary`
- 支持 `failed` 与 `pending` 重试

**边界：**
- 禁止调用真实 AI 外部 API
- 队列仅实现最小能力（enqueue/dequeue/ack），避免重量级编排框架

### 3.2.4 知识展示模块
**功能：**
- 笔记详情页展示：摘要、标签、知识点（PointCard）
- 展示“该笔记关联复习卡数量”
- 支持查看“原始知识 <-> 生成内容”映射关系
- 侧边栏目录（H2/H3）与定位导航
- 内嵌增强代码块（高亮+复制反馈）

**边界：**
- Phase 1 以可读性与信息结构为主，不做复杂协同编辑

### 3.2.5 复习计划与闭卷复习模块
**功能：**
- 全局复习入口（顶部“复习计划”与侧边“进入闭卷复习”）
- 默认仅展示“今日待复习”卡片，支持筛选
- 问题先隐藏答案，点击显示后进行四级评分
- 评分选项：Again / Hard / Good / Easy（1~4）
- 写入 `review_logs`，更新 `flashcards.fsrs_state/next_review/last_review`

**边界：**
- FSRS 可先用简化版实现，但数据结构与评分语义要对齐 Anki 风格

### 3.2.6 任务进度与状态观测模块
**功能：**
- **任务页（`/tasks`）**：集中查看与「原始知识梳理 → 生成笔记 / 复习卡」相关的异步任务列表（任务类型、关联 `raw_id`、状态、进度、错误摘要、产物跳转：笔记 ID、卡片数量等）
- **原始知识库（`/raw`）**：按条展示 `raw_knowledge` 处理状态，支持触发处理与重试
- 前端轮询刷新（非 WebSocket/SSE），终态或超时停止
- 失败原因可见，支持一键重试

**边界：**
- Phase 1 不强制实时推送能力
- 任务数据与 `raw_knowledge` 状态、`task_status`（若建表）或队列任务元数据对齐，避免两套互相矛盾的事实来源（以库表状态为准时可由任务列表派生展示）

---

## 4. 核心业务流程与交互时序

## 4.1 上传与处理闭环
1. 用户通过顶栏右侧 **「上传知识」** 按钮进入 `/upload`，在该页选择或拖拽 **单个 `.md` 文件** 并提交上传（也可从首页快捷入口进入同一页）
2. 前端以 `multipart/form-data` 调用 `POST /api/raw/upload`（仅文件字段，见 API 节）
3. 后端校验并写入 `raw_knowledge(status=pending)`
4. 用户在 **原始知识库**（`/raw`）对记录手动点击「开始处理」（或库内启用「上传后自动梳理」类选项，若产品开启）
5. 前端调用 `POST /api/raw/{raw_id}/process`
6. 后端校验状态并原子更新到 `processing`，随后入队
7. Worker 消费任务，执行 mock processor
8. 成功：写入 `notes/flashcards`，`raw_knowledge.status=processed`
9. 失败：`raw_knowledge.status=failed` + 错误摘要
10. 前端在 **原始知识库** 与 **任务** 页轮询列表/详情接口，直至终态并展示摘要（任务页聚合展示「生成笔记 / 复习卡」相关处理任务）

## 4.2 笔记查看与复习联动
1. 用户进入笔记详情页
2. 页面加载笔记与关联卡片统计
3. 用户可在侧栏点击“进入闭卷复习”
4. 复习页默认仅查询 `next_review <= today` 卡片
5. 用户答题后评分，后端更新排程，返回下次复习时间

## 4.3 失败与重试流程
1. 任务执行异常 -> 写失败摘要
2. **原始知识库**、**任务** 页及上传结果反馈区显示失败原因
3. 用户点击重试 -> 再次触发处理
4. 状态重置为 `processing` 并重新入队

---

## 5. 前端实现设计

## 5.1 页面与路由
以下路由与 **§8.0 全站导航与页面入口** 中的主导航、用户菜单一一对应，便于实现统一 `AppShell`（顶栏 + 可选侧栏 + 主内容）。

| 路径 | 页面名称 | 说明 |
|------|----------|------|
| `/` | 首页 | 总览：今日待复习数量、最近处理中的原始知识/任务、最近笔记入口；快捷按钮含「上传知识」（同顶栏右侧按钮目标 `/upload`）、「复习」「笔记列表」「原始知识库」 |
| `/upload` | 上传知识 | **唯一** Phase 1 `.md` 文件提交入口：选择/拖拽文件、上传进度与结果反馈；上传成功后引导用户前往 **原始知识库**（`/raw`）查看记录与触发处理 |
| `/raw` | 原始知识库 | 原始知识列表与运维主界面：按状态筛选、查看详情、触发/重试处理、批量操作；与主导航文案「原始知识库」对应 |
| `/tasks` | 任务 | 查看生成笔记、复习卡相关的处理任务（列表 + 详情/抽屉 + 跳转笔记） |
| `/notes` | 笔记列表 | 处理完成后生成的笔记入口（卡片/表格列表，点击进入详情） |
| `/notes/:noteId` | 笔记详情 | 知识点展示、侧栏目录、闭卷复习入口、关联卡片数 |
| `/review` | 复习计划 / 闭卷复习 | 今日待复习、筛选、Q&A 与评分 |
| `/auth` | 注册/登录 | 未登录时主导航仍可展示品牌与「登录」；业务页受保护时重定向至此 |

**未登录与已登录导航差异：**
- 未登录：顶栏展示 Logo、产品名、「登录」「注册」；不展示「原始知识库」「任务」「笔记」「复习」等业务链；**不展示**「上传知识」按钮（或展示为禁用并点击引导登录）。
- 已登录：顶栏中间为业务主导航 + 右侧 **「上传知识」** 主按钮 + 工具区 + 用户头像/下拉（账户设置占位、退出）。

## 5.2 组件分层
- **Layout 层**：`AppShell`、`TopNav`（主导航栏）、`Sidebar`（笔记详情等双栏页）、`Breadcrumb`、`PageContainer`
- **Ingest 层**：`MarkdownFileUpload`（仅文件：`input[type=file]` + `accept=".md"` + 拖拽区）、`RawTable`、`StatusBadge`、`ProcessButton`、`TaskProgress`
- **Knowledge 层**：`PointCard`、`CodeBlock`、`TocSidebar`
- **Review 层**：`QACard`、`ReviewRatingBar`、`DueFilterPanel`
- **Feedback 层**：`Toast`、`EmptyState`、`ErrorBanner`、`Skeleton`

## 5.3 状态管理与数据流
- API 层：按资源拆分 `rawApi`, `noteApi`, `cardApi`, `authApi`, `tasksApi`
- 页面状态：
  - 上传区本地状态（**当前选中的 File 对象或 null**、客户端校验错误如扩展名/大小、提交中）
  - 记录列表状态（筛选、分页、排序）
  - 轮询控制状态（是否运行、间隔、超时）
- 推荐使用 React Query/SWR 统一缓存与轮询；无库时至少实现：
  - 请求取消（页面切换/组件卸载）
  - 防抖提交（避免重复触发）
  - 终态停止轮询

## 5.4 上传页与原始知识库交互规范

**上传页（`/upload`）**
- 提交成功：显示创建记录编号 + 状态 `pending`，并引导跳转 **原始知识库**（`/raw`）进行后续处理与查看
- 提交失败：**保留用户已选文件**（若仍合法）以便一键重传；若错误为扩展名/类型，提示仅支持 `.md` 并清空选择

**原始知识库（`/raw`）与任务页（`/tasks`）**
- 处理触发：
  - 可触发状态：`pending|failed`
  - 非法状态：提示拒绝原因并刷新该条状态
- 状态展示（表格/列表/任务卡片统一语义）：
  - `pending` 灰色
  - `processing` 蓝色（含进度动画）
  - `processed` 绿色（展示摘要/产物数）
  - `failed` 红色（展示错误摘要+重试按钮）

## 5.5 知识详情页 UI 规范
- 顶部 Sticky Header，56px，高斯模糊背景
- 双栏布局：主内容 `max-w-[850px]`，侧栏宽 280px 且 sticky
- PointCard：序号徽标+标题+正文+可选代码块
- ToC 激活项：绿色左边条 + 文本高亮
- CodeBlock：mac 风格装饰点、语言标签、复制后 `Check` 2 秒反馈

## 5.6 复习页交互规范
- 默认隐藏答案（闭卷态）
- 点击“显示答案”后出现评分条
- 评分按钮：
  - Again（1）/ Hard（2）/ Good（3）/ Easy（4）
- 每次评分后：
  - 卡片即时更新状态
  - 顶部统计更新（剩余待复习数）

## 5.7 响应式与可访问性
- 移动端：侧边栏折叠到抽屉或底部导航
- 低端设备禁用 `backdrop-blur`
- 键盘可达（Tab 顺序、Enter 提交）
- 复制失败提供 Toast：`手动选择复制`

---

## 6. 后端实现设计

## 6.1 分层架构
- `routers/`：HTTP 路由与参数校验
- `services/`：业务服务（raw、processing、review、queue）
- `db/`：数据库访问与事务封装
- `models/`：Pydantic schema + ORM model
- `workers/`（建议新增）：任务消费入口

## 6.2 数据模型（Phase 1）

### 6.2.1 raw_knowledge
- `raw_id` (uuid, PK)
- `user_id` (uuid, FK)
- `file_name` (varchar 255)
- `content` (text)
- `status` (`pending|processing|processed|failed`)
- `created_at`, `updated_at`
- 建议补充：`error_summary`、`processed_at`

### 6.2.2 notes
- `note_id` (uuid, PK)
- `user_id`, `raw_id` (FK)
- `title`, `abstract`
- `tags` (jsonb string[])
- `content_json` (jsonb points[])
- `created_at`

### 6.2.3 flashcards
- `card_id` (uuid, PK)
- `user_id`, `note_id` (FK)
- `point_id` (logic FK to point id)
- `question`, `answer`
- `fsrs_state` (jsonb)
- `next_review`, `last_review`, `created_at`
- 索引：`next_review`

### 6.2.4 review_logs
- `log_id` (bigint, PK auto increment)
- `card_id`, `user_id`
- `rating` (1~4)
- `elapsed_days`, `scheduled_days`
- `review_at`

### 6.2.5 task_status（建议）
- `task_id`, `raw_id`, `task_type`
- `current_step`, `progress_percent`
- `error_msg`, `created_at`

## 6.3 状态机与幂等规则
- 允许触发处理：`pending`, `failed`
- 拒绝触发：`processing`, `processed`
- 成功路径：`processing -> processed`
- 失败路径：`processing -> failed`
- 幂等：同一 `raw_id` 在 `processing` 时拒绝重复入队

## 6.4 处理器契约（可替换）
输入：
- `raw_id`, `user_id`, `content`, `file_name`

输出（统一结构）：
- `note_payload`（标题、摘要、tags、points）
- `card_payloads`（point_id -> Q&A + 初始 fsrs_state）
- `processing_summary`（统计信息）

错误输出：
- `error_code`, `error_message`, `debug_hint`

## 6.5 队列与 worker
- 队列接口：
  - `enqueue(job)`
  - `dequeue()`
  - `ack(job)`
  - `nack(job, retryable)`
- Redis/Upstash 配置按环境变量切换
- Worker 处理流程：
  1. 取任务
  2. 锁定并二次校验状态
  3. 执行 processor
  4. 事务回写 notes/cards/raw status
  5. ack/nack

## 6.6 认证与权限控制
- 所有资源型 API 统一鉴权依赖
- `user_id` 由 Token `sub` 注入，不接受前端直传覆盖
- 读写均校验资源归属
- Token 无效统一 `401`

---

## 7. 前后端 API 设计（Phase 1）

说明：
- 前缀统一 `/api`
- 除注册/登录外，均需 `Authorization: Bearer <token>`
- 返回结构建议统一：
  - 成功：`{ success: true, data, request_id }`
  - 失败：`{ success: false, error: { code, message, details? }, request_id }`

## 7.1 认证 API

### `POST /api/auth/signup`
请求：
```json
{
  "email": "user@example.com",
  "password": "abc12345",
  "nickname": "Maple"
}
```
响应：`201`，返回用户基础信息
错误：`400` 参数非法，`409` 邮箱已存在

### `POST /api/auth/signin`
请求：
```json
{
  "email": "user@example.com",
  "password": "abc12345"
}
```
响应：`200`
```json
{
  "access_token": "jwt",
  "token_type": "bearer",
  "expires_in": 86400
}
```

## 7.2 原始知识 API

### `POST /api/raw/upload`
说明：上传 Markdown **文件**；Phase 1 **仅**支持 `multipart/form-data`，**不支持** JSON  body 传 `content` 或纯文本录入。

请求：
- `Content-Type: multipart/form-data`
- 字段名（约定）：`file` —— 单个文件；必须为 `.md`（按 `Content-Disposition` 文件名或 `application/octet-stream` + 扩展名校验）
- 服务端读取文件字节为 UTF-8 文本（非法编码时返回明确错误），写入 `raw_knowledge.content`，`file_name` 取自上传文件名（做长度与路径穿越安全处理）

响应：`201`
```json
{
  "raw_id": "uuid",
  "status": "pending",
  "created_at": "2026-04-27T11:00:00Z"
}
```
错误：`400` 非 multipart、缺文件、非 `.md`、空文件、解码失败，`413` 文件过大，`415` 若单独区分不支持的媒体类型

### `GET /api/raw`
说明：查询原始知识列表
查询参数：`status?`, `keyword?`, `page?`, `page_size?`
响应：`200` 列表 + 分页信息

### `GET /api/raw/{raw_id}`
说明：查询单条原始知识详情（含状态、错误摘要、关联产物统计）
错误：`404` 不存在或非本人资源

### `POST /api/raw/{raw_id}/process`
说明：触发处理任务
请求：
```json
{
  "force_retry": false
}
```
响应：`202`
```json
{
  "raw_id": "uuid",
  "status": "processing",
  "task_id": "uuid",
  "message": "processing accepted"
}
```
错误：
- `409` 当前状态不允许触发
- `423` 任务已在处理中

## 7.3 笔记 API

### `GET /api/notes`
说明：按用户查询笔记列表，支持按 `raw_id/tag/keyword` 过滤

### `GET /api/notes/{note_id}`
说明：获取笔记详情（`content_json` + 关联卡片数量 + 来源 raw）

## 7.4 复习卡 API

### `GET /api/cards/due`
说明：查询待复习卡片（默认 `next_review <= now`）
参数：`scope=global|note`, `note_id?`, `include_future?`

### `POST /api/cards/{card_id}/review`
说明：提交一次复习评分
请求：
```json
{
  "rating": 3,
  "reviewed_at": "2026-04-27T11:30:00Z"
}
```
响应：`200`
```json
{
  "card_id": "uuid",
  "next_review": "2026-04-30T11:30:00Z",
  "fsrs_state": {
    "stability": 3.2,
    "difficulty": 4.6,
    "reps": 7
  }
}
```

## 7.5 任务状态 API（建议）

### `GET /api/tasks`
说明：分页查询当前用户的处理任务列表，用于导航 **「任务」** 页；任务与「从原始知识生成笔记 / 复习卡」的处理编排对应。

查询参数：`status?`（如 `queued|processing|completed|failed`）、`raw_id?`、`page?`、`page_size?`、`sort?`（默认按 `created_at` 倒序）

响应：`200`，列表项建议字段：
- `task_id`, `raw_id`, `task_type`（如 `entropy_deconstruction`）
- `status`, `current_step`, `progress_percent`
- `error_msg`（失败时）
- `result_summary`（成功时简要：`note_id`、`flashcard_count` 等，便于跳转）

### `GET /api/tasks/{task_id}`
说明：返回单条任务步骤与进度，用于任务详情抽屉及原始知识库行内进度
响应：
```json
{
  "task_id": "uuid",
  "raw_id": "uuid",
  "current_step": "extracting_points",
  "progress_percent": 65,
  "status": "processing",
  "error_msg": null,
  "note_id": null,
  "flashcard_count": null
}
```

---

## 8. 前端界面具体设计

## 8.0 全站导航栏与各页面入口

Phase 1 所有已登录页面共享 **顶部固定导航栏（Sticky TopNav，高度 56px）**，与 `design-ui.md` 一致：半透明白底、`backdrop-blur-md`（低端可降级）、底部分割线 `border-light`。

### 8.0.1 顶栏左侧（品牌区）
- Logo（品牌主色方块图标）+ 文案「Entropy Zero」
- 点击 Logo/文案跳转 **`/` 首页**

### 8.0.2 顶栏中间（主导航 — 各页面入口）
以下为 **一级文字导航入口**（链接样式），建议横向排列；当前路由对应项使用 `brand-primary` 下划线或文字高亮（`text-main` + `font-semibold`）。**「上传知识」不在中间导航出现**，见 §8.0.3。

| 导航文案 | 目标路由 | 说明 |
|----------|----------|------|
| 首页 | `/` | 总览与快捷入口 |
| 原始知识库 | `/raw` | 已上传 `.md` 对应记录的列表、状态、筛选、触发/重试处理；Phase 1 浏览与管理原始知识的主入口 |
| 任务 | `/tasks` | 查看「生成笔记 / 复习卡」相关异步任务：进度、失败原因、完成后跳转笔记等 |
| 我的笔记 | `/notes` | 已生成笔记列表；无数据时展示空状态与引导去 **原始知识库** 或 **上传知识** |
| 复习计划 | `/review` | 今日待复习与闭卷复习 |

### 8.0.3 顶栏右侧（上传按钮、工具与用户）
自左向右建议顺序（已登录）：

1. **「上传知识」主按钮（Primary）**  
   - 视觉：`brand-primary` 填充或描边+强调，与中间文字链区分（按钮组件，如 `Button` `size=default`）  
   - 行为：跳转 **`/upload`**，即 **唯一** `.md` 文件选择与提交的页面入口  
   - 文案固定为「上传知识」；不在中间导航重复该文案  

2. **搜索**（图标按钮，Phase 1 可占位：点击 Toast「即将推出」或聚焦全局搜索框占位）

3. **通知**（图标占位，可选）

4. **用户区**：未登录显示「登录」「注册」链接至 `/auth`；已登录显示头像下拉菜单：
   - 「账户设置」（占位链接）
   - 「退出登录」

**窄屏**：中间主导航收入汉堡抽屉（§8.0.6）；**「上传知识」按钮仍保留在顶栏右侧**（可缩小 padding 或改为「上传」二字），保证录入路径始终可见。

### 8.0.4 面包屑（Breadcrumb）
- 位于顶栏下方主内容区顶部或嵌入顶栏第二行（窄屏可折叠为标题旁小字）
- 示例：`首页 > 原始知识库`、`首页 > 上传知识`、`首页 > 任务`、`首页 > 我的笔记 > 笔记标题`（笔记详情页动态标题）
- 每一项可点击回退到对应列表或首页

### 8.0.5 笔记详情页内区域入口（与顶栏配合）
- **页面内右侧边栏（280px）** 顶部：**「进入闭卷复习」** 宽幅按钮（`brand-primary` 背景），跳转 `/review` 并携带 `noteId` 查询参数或复习会话状态，与需求文档一致
- 边栏其余：目录 ToC、关联复习卡数量、跳转「全局复习」链接

### 8.0.6 移动端导航
- 顶栏保留 Logo + **右侧「上传知识」按钮**（与桌面一致，优先保证可点达）
- 中间主导航收入 **「菜单」抽屉**（汉堡按钮），抽屉内列出：**首页、原始知识库、任务、我的笔记、复习计划**（与 §8.0.2 表一致，不含「上传知识」以免与按钮重复）
- 首页可保留次要快捷卡片「去上传」「去知识库」以强化首次使用路径

---

## 8.1 全局视觉令牌（Design Tokens）
- `bg-page`: `#F8FAFC`（全局背景）
- `bg-surface`: `#FFFFFF`（卡片背景）
- `brand-primary`: `#059669`（主按钮/激活态）
- `text-main`: `#0F172A`
- `text-muted`: `#64748B`
- `border-light`: `#E2E8F0`
- `bg-code`: `#1E1E2E`

圆角/阴影：
- `2xl`（16px）用于主卡片与侧栏
- `xl`（12px）用于 Q&A、代码块
- `lg`（8px）用于按钮与徽章
- `shadow-sm` 默认，`shadow-md` 悬停

## 8.2 布局规范
- Sticky Header：`h-14`，半透明白底 + blur
- 主容器：`max-w-[1400px]` 居中
- 主内容区：`max-w-[850px]`，移动端 16px/桌面端 32px padding
- 侧边栏：宽 280px，`top: 96px` sticky，超长内容独立滚动且隐藏滚动条

## 8.3 上传页（`/upload`）
由顶栏右侧 **「上传知识」** 按钮进入；职责聚焦 **单次/连续文件上传**，不承载完整知识库表格（表格在 **原始知识库**）。

页面区域：
- 上传面板（**仅**拖拽 `.md` 文件至虚线区域 + 点击选择文件；`accept=".md"`；**不包含** Markdown 大文本输入框、粘贴即入库）
- 上传进度与结果反馈（成功：`raw_id`、提示前往 **原始知识库** 处理；失败：可重选文件重传）
- 可选：最近一次上传摘要（小列表），链到 `/raw?highlight=<raw_id>`

关键交互：
- 主按钮「开始上传」loading 态 + 防重复提交
- 成功后可一键跳转 **`/raw`** 查看新记录

## 8.3.1 原始知识库页（`/raw`）
主导航 **「原始知识库」** 对应页面。

页面区域：
- 筛选与搜索（按 `status`、文件名关键字等）
- 表格：文件名、状态、创建/更新时间、操作（查看详情、开始处理/重试）
- 行内或详情抽屉：`processing` 动态状态 + 轮询、`processed`/`failed` 摘要、产物跳转（笔记、卡片数量）
- 批量选中后触发处理（若 Phase 1 实现批量）

## 8.3.2 任务页（`/tasks`）
主导航 **「任务」** 对应页面。

页面区域：
- 任务列表：任务类型、关联原始知识（`raw_id` / 文件名）、状态、进度条、`current_step`、创建时间
- 筛选：进行中 / 已完成 / 失败
- 行点击或详情抽屉：完整进度、错误信息、`note_id` 跳转 **我的笔记** 详情、复习卡数量展示
- 与 **原始知识库** 行为一致：失败任务支持「重试」入口（调用同一 `POST /api/raw/{raw_id}/process` 或任务级 retry 接口，二选一需在实现时统一）

## 8.4 笔记详情页（Knowledge View）
- 顶部：标题、摘要、标签、来源原始知识入口
- 中部：PointCard 列表，支持 Markdown 渲染与代码高亮
- 右侧：ToC + 复习入口按钮 + 关联卡片统计
- 闭卷模式按钮：高亮绿色，Brain 图标呼吸动画（`scale 1 -> 1.05`）

## 8.5 复习页（Review）
- 卡片区默认仅显示问题
- 点击显示答案后解锁评分条
- 评分按钮风格分级（Again 红、Hard 橙、Good 蓝、Easy 绿）
- 顶部统计：今日待复习、已完成、连续天数（可先占位）

---

## 9. 非功能性要求

## 9.0 工具链、包管理与本地命令（必修）

以下约定与仓库实践一致，实现 Phase 1 时应遵守，避免因工具不一致导致无法运行或 CI 失败。

| 层级 | 要求 |
|------|------|
| 前端 | **pnpm** 作为包管理器（Node.js **20+**）；依赖安装 `pnpm install`，脚本以 `package.json` 为准 |
| 后端 | **Python 3.12**，使用 **uv** 管理虚拟环境与依赖（`uv sync` / `uv run …`）；勿与项目约定的其它 Python 版本混用 |
| 数据库（本地） | **PostgreSQL**（版本以 `CLAUDE.md` / 仓库说明为准，通常 14+）；本地库名、连接串见 **本地** `.env`，**勿提交**密钥 |
| Redis（本地） | 异步队列开发时使用 **本地 Redis**；生产可用 **Upstash Redis**（环境变量区分） |

**本地启动（示意，路径相对于 `projects/entropy-zero/`）**

- 后端：`cd backend && uv run uvicorn app.main:app --reload --port 8000`
- 前端：`cd frontend && pnpm dev`
- 数据库：执行迁移 SQL 初始化 schema（命令以仓库 README / `CLAUDE.md` 为准）

## 9.1 性能
- 上传与列表接口 P95 < 500ms（不含大文件上传）
- 轮询间隔建议 2~5 秒，终态立即停止
- 代码分包：上传页、原始知识库、任务页、复习页按路由懒加载

## 9.2 安全
- 严格鉴权 + 资源归属校验
- SQL 注入/XSS 基础防护（参数化查询 + Markdown 渲染白名单）
- 错误返回不泄露堆栈，仅日志保留 debug 信息

## 9.3 兼容性
- 响应式支持移动端
- 浏览器剪贴板不可用时提供降级提示
- 低性能设备禁用复杂毛玻璃特效

## 9.4 可运维性
- 关键事件日志：上传、触发、状态转换、失败原因
- `request_id/task_id/raw_id` 可串联排障
- 部署前检查：env、RLS、CORS、迁移一致性

## 9.5 部署目标与环境区分

| 环境 | 用途 | 说明 |
|------|------|------|
| **生产** | 线上用户 | **Vercel**（前端静态资源 + Serverless Python API 入口）+ **Supabase**（PostgreSQL、Auth 等）；队列/Redis 按项目使用 **Upstash** 等；连接信息仅来自部署平台环境变量，**禁止**在源码中硬编码生产连接串 |
| **本地开发** | 工程师本机 | 使用**本地 PostgreSQL** 与 **本地 Redis**；`backend/.env`、`frontend/.env` 分别配置 **`DATABASE_URL`、`REDIS_URL`、`VITE_API_BASE_URL`** 等，**不得**将含密钥的 `.env` 提交到版本库 |

实现时须在配置层区分 `development` / `production`（或等价变量），避免本地误连线上或线上误用本地默认地址。

## 9.6 Mock、占位实现与最小影响修改

- **非必要不使用 mock**：与 `projects/entropy-zero/CLAUDE.md` 一致；若必须使用可删除的 mock，须在 **`CLAUDE.md` 的 Mock registry** 中登记路径与清理计划。
- **功能修改范围**：只改当前需求涉及的模块与函数；修改公共模块时尽量缩小影响面，避免顺带改动无关功能（同上见 `CLAUDE.md`）。

---

## 10. Phase 1 实施优先级与验收

## 10.1 实施优先级
1. 数据模型/状态机统一（前后端类型对齐）
2. 上传、列表、触发处理 API 可用
3. 队列 + mock processor + 回写闭环
4. 原始知识库与任务页状态可视化与重试；上传页结果反馈与跳转
5. 笔记详情页与复习页主流程联调
6. 鉴权与权限收口、错误码统一

## 10.2 验收标准（必须全部通过）
- 能通过 **仅 `.md` 文件** 上传落库为 `pending`（拒绝非 `.md`、拒绝 JSON 正文替代上传）
- 顶栏中间导航包含：**首页、原始知识库、任务、我的笔记、复习计划**；右侧含 **「上传知识」** 主按钮指向 `/upload`；路由与 §8.0 一致；未登录与已登录表现符合 §8.0
- **任务** 页可列出与生成笔记/复习卡相关的任务并查看进度或跳转产物
- 可触发处理并进入 `processing`
- 成功任务进入 `processed` 且可见生成产物
- 异常任务进入 `failed` 且可见失败摘要
- `failed` 任务可重试并恢复流转
- 笔记详情可查看 points、代码块、关联卡片
- 复习页支持隐藏答案、评分、更新下次复习时间
- 非本人资源访问被拒绝（401/404）

---

## 11. 与后续 Phase 的衔接
- Phase 2 接入真实 AI 时，仅替换 `processor` 实现，不改 API 契约
- 可将轮询升级为实时订阅（SSE/WebSocket/Supabase Realtime）
- FSRS 从简化版演进到完整参数模型
- 增加任务表与运营后台提升可观测性

## 12. 相对 `project.md` 的覆盖说明（可废弃索引文档）

原 `工作台/项目文档/project.md` 中的要点已吸纳如下，**Phase 1 开发可不再打开 `project.md`**：

| `project.md` 原内容 | 在本文中的位置 |
|---------------------|----------------|
| 代码目录 `projects/entropy-zero/` | **§1.2** |
| 需求/技术文档路径引用 | **§1.1**（权威归一，冲突以本文为准） |
| Python 用 **uv** | **§9.0** |
| 前端用 **pnpm** | **§9.0** |
| **不实现真实 AI API 调用** | **§1** 约束列表 + **§6.4–6.5** 编排与处理器边界 |

---

本规格可作为 Phase 1 的产品、前端、后端、测试统一执行基线；**扩展工程纪律与 Mock 登记表以 `projects/entropy-zero/CLAUDE.md` 为准**。
