## 1. Data Contract and Model Updates

- [x] 1.1 定义并实现 `KnowledgeClaimType` 与 `MetaTag` 领域模型（含 `custom:*` 校验规则）
- [x] 1.2 更新 Agent 输出 DTO 为 `meta_tag + typed notes + claim/question` 结构
- [x] 1.3 增加 `claim_type -> card_type` 机械映射与 answer 本地拼接逻辑

## 2. Agent Pipeline Refactor

- [x] 2.1 将 orchestrator 重构为单次 LLM 调用流水线并移除多次分段调用依赖
- [x] 2.2 实现本地语言检测模块并接入 pipeline 入口
- [x] 2.3 更新 Prompt 渲染输入，注入 claim_type 枚举与文档级输出约束

## 3. Deterministic Post-processing

- [x] 3.1 实现后处理校验：`meta_tag` 规范化、`claim_type` 合法性检查、空字段兜底
- [x] 3.2 实现 `p_id` 修复、文本截断、topics 去重与长度限制
- [x] 3.3 补充结构化错误返回（含可展示 error code/message）

## 4. Worker Persistence and Migration

- [x] 4.1 新增数据库迁移：`raw_knowledge.meta_tag_json` 与 `notes.claim_type` 字段
- [x] 4.2 更新 worker 事务写入逻辑以持久化 meta_tag、typed notes 与 flashcards
- [x] 4.3 为 `domain/topics/claim_type` 查询路径补充必要索引与兼容读取逻辑

## 5. Tests and Rollout

- [x] 5.1 新增/更新单元测试：语言检测阈值、类型校验、answer 拼接、question 防泄露
- [x] 5.2 新增/更新集成测试：单次调用输出到 worker 落库的端到端链路
- [x] 5.3 验证 `ENTROPY_AGENT` 开关回退路径与日志/可观测性字段完整性
