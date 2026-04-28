## Why

Phase 1 使用无 LLM 的确定性占位处理器，仅能提取文件名作为标题、截断原文作为摘要，输出的笔记与复习卡无实际学习价值。现在进入 Phase 2，需要将处理器替换为真实 AI Agent，使系统能将 Markdown 知识文档分解为原子化知识主张并生成高质量复习卡，实现系统核心价值。

## What Changes

- **新增** `LanguageDetector`：检测原始文档语言（zh/en），决定后续使用的模型与 Prompt 版本
- **新增** `LLMRouter`：持有 `source_lang`，将 LLM 调用路由至对应的模型配置（中文→阿里云百炼 deepseek-v4-pro；英文→Gemini 3 Flash）与 Prompt 模板
- **新增** `StructureAnalyzer`：纯文本解析 Markdown 章节结构（标题层级、行范围、代码围栏），无 LLM
- **新增** `ClaimExtractor`：每个 section 调用一次 LLM，提取原子化 `core_claims`（含 evidence、source_lines、anti_patterns）
- **新增** `NotePartitioner`：按主题内聚性将 claims 聚合为 1..N 个 Note，一份文档可产出多个笔记
- **新增** `CardGenerator`：每个 Note 调用一次 LLM，为每个 claim 生成严格 1:1 的 Flashcard
- **新增** `AgentOrchestrator`：主控流水线，分步推进并更新 `ProcessingTask` 进度
- **替换** `processor.py` 中的 `run_deterministic_processor` 为 `run_agent_processor`（通过 `ENTROPY_AGENT=1` 环境变量激活，原占位实现保留作 fallback）
- **扩展** `Note.content_json` 中的 `Point` schema，新增 `claim`、`evidence`、`anti_patterns`、`hooks` 字段（向下兼容）
- **新增** DB migration `002_agent_fields.sql`：为 `flashcards` 表添加 `card_type`、`explanation`、`claim_ref` 字段
- **新增** 双语 Prompt 模板（`claim_extraction_zh/en.jinja2`、`card_generation_zh/en.jinja2`）

## Capabilities

### New Capabilities

- `ai-agent-pipeline`：完整的 AI Agent 处理流水线（LanguageDetector → LLMRouter → StructureAnalyzer → ClaimExtractor → NotePartitioner → CardGenerator），将 Markdown 转换为原子化知识主张和高质量复习卡
- `bilingual-llm-routing`：双语模型路由能力，中文文档使用阿里云百炼 deepseek-v4-pro，英文文档使用 Gemini 3 Flash，两者均通过 OpenAI 兼容接口调用

### Modified Capabilities

- `deterministic-processor`：当前 spec 要求"MUST NOT 包含向大模型供应商发起的 HTTP 客户端调用"，Phase 2 需修改此约束：通过 `ENTROPY_AGENT` 环境变量区分，`=0` 时仍使用确定性占位（保持原 spec 不变），`=1` 时启用 AI Agent 路径（允许 LLM HTTP 调用）。

## Impact

- **后端**：`backend/app/agent/`（新目录），`backend/app/worker.py`（调用点替换），`backend/app/services/processor.py`（保留）
- **数据库**：`database/migrations/002_agent_fields.sql`（新增 flashcards 字段）
- **环境变量**：新增 `ENTROPY_AGENT`、`DASHSCOPE_API_KEY`、`GEMINI_API_KEY`（暂不需配置）、`AI_MAX_TOKENS`
- **依赖**：新增 `openai`（Python SDK，用于 OpenAI 兼容调用）、`jinja2`（Prompt 模板渲染）
- **不影响**：前端、API 路由、任务调度（`tasks-observability-api`）、认证（`api-bearer-auth`）
