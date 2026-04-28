## Context

现有 Agent 路径已具备基础双语路由与处理链路，但核心数据契约仍偏“步骤驱动”，导致跨文档聚合能力不足：Note 以主题内聚分组不稳定、文档级标签缺失、card question 与 claim 生成割裂。目标方案要求在单次 LLM 调用内返回稳定的类型驱动结构，并在本地进行确定性修复与校验，最终由 worker 按统一模型持久化。

约束包括：
- 保持 `ENTROPY_AGENT` 开关语义不变，确保 Phase 1 回退路径可用。
- 保持处理边界：LLM HTTP 调用仍集中在 router，不在各组件散布。
- 数据层需要可迁移扩展：`raw_knowledge` 保存文档级 `meta_tag`，`notes` 保存 `claim_type`。

## Goals / Non-Goals

**Goals:**
- 将 Agent 输出标准化为 `meta_tag + claim_type notes + claims/questions`。
- 实现本地语言检测，减少对远端语言判断依赖并稳定路由输入。
- 建立后处理规则，确保返回结构在持久化前可用且可审计。
- 让 worker 写库结果可直接支持前端按 `domain/topics/claim_type` 过滤。

**Non-Goals:**
- 不在本变更中重做前端页面交互与视觉方案。
- 不引入多次 LLM 调用编排或复杂工具调用链。
- 不在本变更中定义 claim 内容质量评分系统。

## Decisions

1. **采用 claim_type 作为 Note 的唯一分组主轴**
   - 决策：每个 Note 必须携带 `claim_type`，且遵循“1 类型 = 1 Note”。
   - 理由：比主题聚类更稳定，跨文档可直接聚合。
   - 备选：继续主题内聚分组。放弃原因：聚类边界随文档波动，难以对齐前端筛选与统计。

2. **单次 LLM 返回完整结构，本地后处理兜底**
   - 决策：LLM 返回 `meta_tag`、`notes`、`claims`、`card_question`；本地完成合法化修复（类型校验、长度截断、空值兜底、answer 拼接）。
   - 理由：降低调用次数并把关键一致性约束留在可控代码侧。
   - 备选：继续拆分多步 LLM。放弃原因：时延与失败面扩大，且一致性更难保证。

3. **语言检测本地化，路由保持按语言选供应商**
   - 决策：在处理入口先执行本地 CJK 占比检测，再传给路由与 prompt 选择。
   - 理由：减少模型侧不确定性，统一所有下游组件的语言输入。
   - 备选：让每个 LLM 任务自行判定语言。放弃原因：重复计算且结果可能分叉。

4. **持久化模型扩展而非重建**
   - 决策：在现有 `raw_knowledge/notes/flashcards` 结构上增量扩展字段与索引。
   - 理由：风险低、迁移可控、兼容现有 API 与队列流程。
   - 备选：新建并行表。放弃原因：迁移成本高且增加双写复杂度。

## Risks / Trade-offs

- [Risk] `custom:*` 类型增长过快导致分类离散 → Mitigation：记录自定义类型出现频次并定期审计升格。
- [Risk] 单次 LLM 输出过长导致 JSON 不稳定 → Mitigation：保留严格 schema 校验与字段兜底，失败按结构化错误返回。
- [Risk] 新字段迁移影响旧数据读取 → Mitigation：迁移采用向后兼容默认值，读取侧容忍空 `meta_tag` 与空 `claim_type`。
- [Risk] 题干去泄露规则过严导致问题可读性下降 → Mitigation：在后处理加入最小可读性约束并通过回归测试固定样例。

## Migration Plan

1. 增加数据库迁移：`raw_knowledge.meta_tag_json`、`notes.claim_type`，并为查询路径补充必要索引。
2. 更新 ProcessorSuccess/Agent 输出 DTO 与 orchestrator 装配逻辑。
3. 更新 worker 持久化映射，确保新字段写入与旧字段兼容。
4. 补充/更新单元测试与集成测试（语言检测、后处理、持久化边界）。
5. 灰度启用 `ENTROPY_AGENT=1`，异常时可立即回退至确定性路径。

## Open Questions

- `topics` 的最大长度与标准化词典是否需要在本阶段固化。
- `custom:*` 是否需要额外黑名单规则防止与核心类型语义重叠。
- 前端筛选是否需要在同一次发布中同步暴露 `domain/topics/claim_type` 三维过滤。
