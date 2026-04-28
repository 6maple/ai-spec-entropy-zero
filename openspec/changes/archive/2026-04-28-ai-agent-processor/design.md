## Context

Phase 1 的 `processor.py` 是一个确定性占位处理器（`run_deterministic_processor`），由 Worker 通过 `process_job()` 调用。它不涉及任何 LLM，仅做文件名提取标题和原文截断摘要，产出单个 Note 和单张 Flashcard，作为 Phase 1 端到端流程验证的骨架。

Worker → Queue → Processor → DB 的整体边界已在 `queue-worker-boundary` 和 `tasks-observability-api` spec 中稳定，本变更只替换 Processor 内部实现，不改变接口契约。

现行约束（来自 `deterministic-processor` spec）:"MUST NOT 包含向大模型供应商发起的 HTTP 客户端调用"。Phase 2 通过环境变量 `ENTROPY_AGENT` 区分两条路径，保持原约束在 `=0` 时依然成立。

## Goals / Non-Goals

**Goals:**
- 将 Markdown 文档分解为原子化知识主张（`core_claims`），每个 claim 具备完整的 topic、assertion、evidence 和 source_lines
- 每个 claim 严格对应一张 Flashcard，覆盖率 100%
- 支持一份文档产出 1..N 个 Note（按主题内聚性分割）
- 支持中英双语文档，自动检测语言并路由到对应模型（中文→阿里云百炼 deepseek-v4-pro；英文→Gemini 3 Flash）
- 通过 `ENTROPY_AGENT=1` 激活 Agent 路径，原占位实现作 fallback，不破坏现有 Phase 1 测试

**Non-Goals:**
- 前端 UI 适配新的 `CoreClaimPoint` 字段（Phase 2 UI 任务）
- `HooksResolver`（跨 Note 链接）在本次变更中仅定义接口，不实现
- 英文模型测试（当前仅有中文知识，英文路径代码就绪但不配置 Key）
- FSRS 调度算法对 `card_type` 的差异化处理

## Decisions

### D1：在现有 Worker 调用点切换，不新增路由层

**决策**：在 `worker.py` 的 `process_job()` 中按 `ENTROPY_AGENT` 环境变量选择调用 `run_deterministic_processor`（原有）或 `run_agent_processor`（新增），接口签名兼容。

**备选方案**：新增独立 worker 类型或消息队列 topic。

**理由**：现有 Worker 架构（`queue-worker-boundary` spec）已稳定，本变更属于 Processor 内部实现替换，引入新路由层会扩大变更范围并需要修改 queue payload schema。单点切换符合最小 blast radius 原则。

---

### D2：LLMRouter 统一 OpenAI 兼容接口，按语言切换三个参数

**决策**：`LLMRouter` 持有 `source_lang`，通过切换 `api_base`、`api_key`、`model` 三个参数路由到不同平台，使用 `openai` Python SDK 发起调用。

**备选方案**：分别对接 DashScope 原生 SDK 和 Google genai SDK。

**理由**：阿里云百炼和 Gemini 均提供 OpenAI 兼容接口，使用同一 `openai` SDK 可共享重试、超时、JSON mode 等逻辑，不需要维护两套客户端代码。

---

### D3：Point schema 向下兼容扩展，保留 title/body

**决策**：`CoreClaimPoint` 在现有 `Point`（`p_id`、`title`、`body`）基础上新增 `claim`、`evidence`、`anti_patterns`、`hooks` 字段，`title` = claim 主题词，`body` = claim 全文，旧前端不感知新字段。

**备选方案**：完全替换 Point schema。

**理由**：前端 UI 重构在下游变更（`phase-1-notes-cards-review`）中处理，本次不修改前端，必须保持 `content_json` 的向下兼容。

---

### D4：Prompt 按语言独立维护，命名为 `{名称}_{lang}.jinja2`

**决策**：`claim_extraction_zh.jinja2` / `claim_extraction_en.jinja2`、`card_generation_zh.jinja2` / `card_generation_en.jinja2` 分开维护，`LLMRouter.call()` 按 `source_lang` 选择对应文件。

**备选方案**：单一 Prompt 文件内部通过 `{% if lang == 'zh' %}` 条件分支。

**理由**：中英文 Prompt 在语气、术语结构、规则描述上差异显著（阿里 deepseek-v4-pro 更适合中文指令风格，Gemini 更适合英文指令风格），独立文件便于各自迭代优化，不产生耦合。

## Risks / Trade-offs

- **LLM 输出不稳定** → 对每个 LLM 调用结果做 JSON schema 验证；JSON 解析失败时对该 section 重试一次；整个 section 提取失败时记录 error_summary，继续处理其余 section，不终止整个任务
- **API 限流（阿里云百炼免费额度 RPM 限制）** → 指数退避重试（最多 3 次），超出后将任务标记 `failed`，用户可手动重试
- **claim 质量不达标（claim 为标签式短语，无 assertion）** → Prompt 明确约束，同时在 `ClaimExtractor` 输出验证中检测并跳过，记录 warning 而非终止
- **Point 新字段引入 DB content_json 不兼容** → 新字段均为可选，旧记录无新字段时前端降级为 title/body 展示，无 migration 风险
- **英文路径代码就绪但未测试** → `GEMINI_API_KEY` 缺省时 LLMRouter 在英文路径抛出明确的配置错误，不会静默失败

## Migration Plan

1. 创建 `database/migrations/002_agent_fields.sql`，为 `flashcards` 表添加 `card_type`、`explanation`、`claim_ref`（幂等 `ADD COLUMN IF NOT EXISTS`）
2. 部署新后端代码，默认 `ENTROPY_AGENT=0`（占位处理器），系统行为不变
3. 在测试环境配置 `ENTROPY_AGENT=1` 和 `DASHSCOPE_API_KEY`，验证端到端
4. 生产环境切换 `ENTROPY_AGENT=1`

**回滚**：设置 `ENTROPY_AGENT=0` 即可回退，无数据库 DDL 回滚需求（新字段对旧数据无影响）。

## Open Questions

- `deepseek-v4-pro` 是否是百炼当前有免费额度的最优文本模型？（需在百炼控制台确认，若有更优选项可在实现时替换 `model` 字符串）
- `NotePartitioner` 是否需要 LLM 辅助聚类，还是纯规则决策表即可满足质量要求？（可先用规则，实测后决定）
