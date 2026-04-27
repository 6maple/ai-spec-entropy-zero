## 1. 数据模型与迁移

- [x] 1.1 审阅现有 `database/migrations/` 与 ORM 模型，补齐 `raw_knowledge` 所需字段（如 `error_summary`、`processed_at` 等，以 `spec-design` §6.2.1 为准）
- [x] 1.2 若采用独立任务表或 `task_status`：新增迁移、模型与类型，并约定与 `raw_knowledge.status` 的同事务更新策略（见 `design.md`）
- [x] 1.3 为列表/筛选添加必要索引（`user_id`、`status`、`created_at` 等）

## 2. 鉴权与依赖注入

- [x] 2.1 统一 JWT 校验依赖：`sub` → `user_id`，供 Raw/Task 路由注入
- [x] 2.2 资源归属校验辅助函数（raw、task 按用户隔离，`404` 语义）

## 3. 队列抽象与配置

- [x] 3.1 实现 Redis 客户端封装：`enqueue` / `dequeue` / `ack` / `nack`，环境变量切换本地与 Upstash
- [x] 3.2 定义队列 job schema（至少含 `raw_id`、任务类型、可选 `task_id`）

## 4. Raw 服务与路由

- [x] 4.1 实现 `POST /api/raw/upload`：multipart、`file` 字段、`.md` 校验、UTF-8、大小限制、安全 `file_name`，`201` / 相应 `4xx`
- [x] 4.2 实现 `GET /api/raw` 与 `GET /api/raw/{raw_id}`：筛选、分页、详情与衍生计数
- [x] 4.3 实现 `POST /api/raw/{raw_id}/process`：状态门控原子更新、`202` + `task_id`、冲突时 `409`/`423`

## 5. 确定性处理器

- [x] 5.1 定义 Pydantic（或等价）输入/输出模型，对齐 `spec-design` §6.4
- [x] 5.2 实现占位处理器：无对外 HTTP，返回可持久化的 `note_payload` / `card_payloads` / `processing_summary` 或结构化错误

## 6. Worker 进程

- [x] 6.1 新增 Worker 入口（独立进程）：`dequeue` → 二次校验 raw 状态 → 调用处理器 → 事务写 `notes`/`flashcards`/raw（及任务行若存在）→ `ack`/`nack`
- [x] 6.2 在 `CLAUDE.md` 或项目 README 片段中记录本地启动 Worker 的命令（`uv run`）

## 7. 任务可观测 API

- [x] 7.1 实现 `GET /api/tasks`：分页、筛选、状态与 `raw_knowledge` 权威一致
- [x] 7.2 实现 `GET /api/tasks/{task_id}`：详情字段对齐 `spec-design` §7.5 示例

## 8. 测试与验收

- [x] 8.1 上传合法 `.md` → `pending`；非法扩展/空文件 → `4xx` 无行
- [x] 8.2 `pending`/`failed` → `processing` → 终端 `processed` 或 `failed`；`processing` 下重复 `process` 拒绝
- [x] 8.3 静态/CI 检查：仓库内无新增对外 LLM HTTP 客户端依赖路径
