## Context

本变更落实 `phase-1-propose-02.md` 与 `spec-design.md` §6、§7.2、§7.5：在 `projects/entropy-zero/` 内交付可运行的「上传 → 持久化 → 触发处理 → 队列 → 非 LLM 处理器 → 写 notes/flashcards → 终态」后端能力，并为任务页提供可观测 API。产品状态与 API 形状以 `spec-design.md` 为准。

## Goals / Non-Goals

**Goals:**

- Raw 多段 HTTP API 与状态门控的处理入口；队列抽象与 Worker 执行边界清晰。
- 处理器可替换、契约稳定；仓库内不出现真实对外 LLM HTTP 客户端。
- 任务列表/详情与 **单一事实来源** 下的处理状态一致。
- 受保护路由统一 Bearer JWT，`user_id` 仅来自 `sub`。

**Non-Goals:**

- FSRS 调度、完整 Auth UI、真实 LLM 处理器、以 JSON body 替代 multipart 摄入。

## Decisions

1. **Worker 拓扑（相对 Vercel 约束）**  
   - **选定**：API 进程（可部署于 Vercel）**仅负责校验、状态迁移、入队**；**消费与长阻塞在独立 Worker 进程**中执行（同仓库 `workers/` 或等价 CLI 入口，`uv run` 启动）。  
   - **理由**：Serverless 函数不适合常驻 `BRPOP`/长轮询；与 `spec-design` §6.5 的 dequeue/ack 流程一致。  
   - **备选**：进程内后台 Task——仅适合本地演示，**不**作为生产默认，避免与无状态部署模型冲突。

2. **处理状态单一事实来源**  
   - **选定**：**`raw_knowledge.status`**（`pending|processing|processed|failed`）为面向用户与 Raw 列表的权威生命周期。  
   - **任务 API**：列表/详情中的 `status`（及 `queued|processing|completed|failed` 等展示枚举）**必须**由同一事务域内的 raw 行与任务行派生；若引入 `task_status`（或等价任务表），**在同一业务事务中与 `raw_knowledge` 同步更新**，禁止出现「任务 completed 而 raw 仍为 processing」的长期不一致。  
   - **幂等**：对 `raw_id` 的「处理中」门控以 **数据库原子条件更新**（仅当 `pending|failed` 时置 `processing`）实现，与 spec §6.3 一致。

3. **Redis 抽象**  
   - 封装 **enqueue / dequeue / ack / nack**；连接串由环境变量切换本地 Redis 与 Upstash（与基线生产约束一致）。

4. **处理器**  
   - 首版实现为 **规则或确定性占位**（如固定模板摘要 + 空/最小卡片集），满足 §6.4 的输入输出字段；错误走 `error_code` / `error_message`（及可选 `debug_hint`），由 Worker 回写 `failed` + `error_summary`。

5. **鉴权**  
   - 与 `spec-design` §7 一致：除注册/登录外，Raw/Task 等资源 API **必须** `Authorization: Bearer`；资源级查询 **必须** 校验 `user_id` 归属。

## Risks / Trade-offs

- **[Risk] Worker 生产托管未在 Phase 1 固定** → **Mitigation**：设计明确 API/Worker 分离；部署清单中说明 Worker 需长连接友好宿主；Vercel 仅承载 API。  
- **[Risk] 任务表与 raw 双写漂移** → **Mitigation**：以 raw 为权威；任务行仅镜像；写入集中在服务层单事务。  
- **[Risk] 大文件上传** → **Mitigation**：明确 `413` 与大小上限配置，与 `CLAUDE.md`/环境变量对齐。

## Migration Plan

1. 新增/调整迁移（`raw_knowledge` 扩展字段、可选任务表）。  
2. 合并路由与服务层 → 再合 Worker 入口与队列实现。  
3. 回滚：保留迁移的 down（若项目约定）；关闭 Worker 消费即可停止处理而保留只读 API。

## Open Questions

- **任务表是否本变更必建**：若仅镜像 raw，可用轻量 `processing_jobs` + `task_id` 外键；若产品强依赖 `current_step`/`progress_percent`，再引入 `task_status` 全字段并与 spec §6.2.5 对齐。  
- **`POST .../process` 的 `force_retry` 语义**：与幂等规则边界在实现前与 `spec-design` 示例 JSON 对齐（默认 `false` 即可满足 Phase 1）。
