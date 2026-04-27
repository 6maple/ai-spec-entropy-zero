## Why

Phase 1 需要一条可运行的管线：上传 `.md` → 持久化 `raw_knowledge` → 用户触发处理 → 队列执行 → 非 LLM 处理器写入 `notes` / `flashcards`（或按 spec 的极简摘要）→ 终态与重试。没有稳定的 HTTP 契约与确定性的状态迁移，前端与后续「笔记/卡片/复习」变更无法可靠对接。

## What Changes

- 新增 **Raw 知识 HTTP API**：multipart 仅 `.md` 上传、列表/筛选/详情、状态门控的「处理」入口并返回 `task_id`。
- 新增 **队列外壳与 Worker 边界**：Redis 抽象（入队/出队/ack/nack）；在 `design.md` 中选定单独进程或进程内受限消费者的部署形态。
- 新增 **可插拔处理器（无对外 LLM）**：稳定入参/出参契约；规则或确定性占位实现，**无**模型供应商 HTTP 客户端。
- 新增 **任务可观测 API**：分页列表与详情，与 `raw_knowledge` 状态及可选 `task_status` 的对齐方式在 `design.md` 中单点定义。
- 新增 **最小鉴权边界**：受保护路由要求 `Authorization: Bearer <token>`，`user_id` 仅来自 JWT `sub`，不信任客户端提供的 `user_id`。

## Capabilities

### New Capabilities

- `raw-knowledge-http-api`：上传、列表（状态/关键词/分页）、详情、处理触发与 `task_id` 返回；与 `spec-design` 状态机一致。
- `queue-worker-boundary`：Redis 客户端抽象、Worker 执行路径、与 Vercel/本地 dev 的拓扑说明。
- `deterministic-processor`：处理器输入 `{ raw_id, user_id, content, file_name }` 与输出 `note_payload` / `card_payloads` / `processing_summary` 及错误码；禁止对外 LLM HTTP。
- `tasks-observability-api`：`GET /api/tasks` 与 `GET /api/tasks/{task_id}`；与用户可见处理状态单一事实来源对齐。
- `api-bearer-auth`：Bearer JWT、`sub` 映射 `user_id`；与受保护路由的约定。

### Modified Capabilities

- （无）本变更通过上述新能力规格落实基线中已有约束（如 multipart `.md`、无真实 LLM）；不修改 `openspec/specs/phase-1-baseline/spec.md` 的条文层级。

## Impact

- **代码**：`projects/entropy-zero/` 下后端路由、服务层、可选 Worker 入口、Redis 与队列封装；可能扩展 `database/migrations/`（含可选 `task_status`）。
- **API**：新增 `/api/raw/*`、`/api/tasks*`；与后续 Proposal 03（摄入 UI）、04（笔记/卡片/复习）的契约依赖。
- **依赖**：本地 Redis / 生产 Upstash；不与 FSRS、完整 Auth UI、真实 LLM 客户端混在本变更范围。
