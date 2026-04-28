## Why

当前 Agent 流程虽已收敛到较少步骤，但仍存在分组不稳定、缺少文档级元数据、以及卡片题干与答案解耦导致可考查性不足的问题，影响跨文档聚合检索与复习质量。现在需要将处理契约升级为“类型驱动 + 元数据驱动 + 协同生成”，为后续前端筛选、worker 持久化和可观测性建立稳定基础。

## What Changes

- 将 Agent 输出模型重构为：文档级 `meta_tag` + 按 `claim_type` 分组的 `notes[]` + claim/question 协同生成结果。
- 以 `KnowledgeClaimType` 作为 note 主分组轴，强制“1 类型 = 1 Note”，仅允许 `custom:*` 作为半开放扩展。
- 在处理链路中引入本地语言检测与后处理校验（类型校验、meta_tag 规范化、字段修复与兜底）。
- 更新 worker 持久化边界：保存 `raw_knowledge.meta_tag_json`，并持久化 `notes.claim_type` 与映射后的卡片类型。
- 调整 processor/agent orchestrator 契约，统一单次 LLM 调用返回结构并下沉本地确定性补全逻辑。

## Capabilities

### New Capabilities
- `ai-agent-claim-type-model`: 定义 claim_type 驱动的数据模型、校验规则与卡片映射契约。

### Modified Capabilities
- `ai-agent-pipeline`: 将处理结果升级为 `meta_tag + claim_type notes` 的单次调用流水线。
- `bilingual-llm-routing`: 由本地语言检测结果驱动 prompt 语言与路由行为。
- `deterministic-processor`: 增加本地后处理规则（字段兜底、类型校验、answer 拼接、去重截断）。
- `queue-worker-boundary`: 扩展 worker 持久化模型，覆盖 meta_tag 与 claim_type 字段。

## Impact

- 影响后端：`projects/entropy-zero/backend/app/agent/*`、`app/services/processor.py`、`app/worker.py` 及对应测试。
- 影响数据模型与迁移：`raw_knowledge`、`notes`、`flashcards` 写入字段与索引策略。
- 影响 API/前端消费：上层可按 `domain/topics/claim_type` 聚合与筛选。
- 对外接口保持兼容优先；若出现字段语义变更，将在 delta spec 中明确迁移与兼容策略。
