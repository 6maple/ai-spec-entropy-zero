## MODIFIED Requirements

### Requirement: Stable processor success output

处理器成功路径 SHALL 返回 `meta_tag` 与 `note_bundles` 的稳定结构。每个 note bundle MUST 包含 `claim_type`、`claims`、`card_payloads`，并可直接供服务层持久化到 `raw_knowledge/notes/flashcards`。

#### Scenario: Processor returns typed bundles
- **WHEN** Agent 处理成功
- **THEN** 返回结构中包含文档级 `meta_tag` 与按 `claim_type` 分组的 note bundles

#### Scenario: Service persists from stable payloads
- **WHEN** 服务层收到成功结构且校验通过
- **THEN** 系统在事务内完成 notes 与 flashcards 写入，并更新 raw 状态为 `processed`

### Requirement: No outbound LLM vendor HTTP

本约束 SHALL 保持按 `ENTROPY_AGENT` 开关区分：关闭 Agent 时 MUST NOT 发起外部 LLM HTTP；开启 Agent 时 MAY 发起 LLM HTTP，但调用 MUST 仅经过 `LLMRouter`。此外，后处理规范化（meta_tag 校验、type 校验、字段兜底）MUST 在本地完成。

#### Scenario: Agent-disabled path remains deterministic
- **WHEN** `ENTROPY_AGENT=0` 或未设置
- **THEN** 系统调用确定性处理路径，不执行任何外部 LLM HTTP 请求

#### Scenario: Agent-enabled path normalizes locally
- **WHEN** `ENTROPY_AGENT=1` 且 LLM 返回结构化结果
- **THEN** 系统在本地执行字段修复、类型校验与 answer 拼接后再进入持久化
