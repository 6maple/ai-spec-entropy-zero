## ADDED Requirements

### Requirement: Claim type driven note model

系统 SHALL 使用 `KnowledgeClaimType` 作为 Note 的唯一分组主轴。每个输出 Note MUST 包含 `claim_type`，并满足“1 类型 = 1 Note”；同一 claim MUST 仅归入一个最贴切类型。

#### Scenario: One type maps to one note
- **WHEN** LLM 输出中存在多个不同 `claim_type`
- **THEN** 系统为每个出现的类型产出独立 Note，且不创建未出现类型的空 Note

#### Scenario: Claim belongs to only one type
- **WHEN** 某条 claim 同时具备多个语义特征
- **THEN** 系统按主导意图选择单一 `claim_type`，不在多个 Note 重复写入

### Requirement: Semi-open claim type validation

系统 SHALL 支持 8 个核心 `claim_type` 与 `custom:<snake_case>` 扩展。后处理阶段 MUST 校验类型合法性，不合法值 MUST 被替换为安全兜底类型并记录告警。

#### Scenario: Core type passes validation
- **WHEN** `claim_type` 属于核心类型集合
- **THEN** 系统直接接受并继续处理

#### Scenario: Custom type accepted with prefix
- **WHEN** `claim_type` 以 `custom:` 开头且后缀符合 snake_case
- **THEN** 系统接受该类型并写入持久化结果

### Requirement: Co-generated claim and card question

系统 SHALL 要求每条 claim 与其 `card_question` 协同生成。`card_question` MUST 可用于考查 claim 且不得泄露答案关键词；`answer` SHALL 在本地由 `claim + evidence` 机械拼接。

#### Scenario: Question generated with claim
- **WHEN** LLM 返回一条 claim
- **THEN** 同一条记录中包含对应 `card_question`，不依赖后续独立问句生成步骤

#### Scenario: Answer assembled deterministically
- **WHEN** 本地后处理执行卡片映射
- **THEN** 系统按固定规则拼接 answer，保证同输入得到同输出
