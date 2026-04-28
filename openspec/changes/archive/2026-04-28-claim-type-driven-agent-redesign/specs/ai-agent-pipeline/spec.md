## MODIFIED Requirements

### Requirement: Atomic claim extraction per section

系统 SHALL 以单次 LLM 调用提取整篇文档的结构化结果，而非按 section 多次调用。返回体 MUST 包含 `meta_tag`、`notes[]`、`claims[]` 与 `card_question`，每条 claim 仍需包含可验证主张、evidence、anti_patterns。

#### Scenario: Single-call structured extraction
- **WHEN** Agent 接收原始 Markdown 内容并进入抽取阶段
- **THEN** 系统仅发起 1 次 LLM 请求并返回完整 JSON 结构

#### Scenario: Claim keeps evidence and anti-patterns
- **WHEN** 返回结果包含多条 claims
- **THEN** 每条 claim 都包含 `claim`、`evidence` 与 `anti_patterns` 字段，缺失时由后处理兜底

### Requirement: Topic-cohesion note partitioning

系统 SHALL 改为按 `claim_type` 进行 Note 分组，MUST NOT 继续使用主题内聚聚类作为主分组规则。分组数量等于文档中实际出现的类型数量。

#### Scenario: Multi-type file produces multiple typed notes
- **WHEN** 文档内容覆盖多个 `claim_type`
- **THEN** `NotePartitioner` 产出与类型数量一致的多个 Note，并在每个 Note 写入对应 `claim_type`

#### Scenario: Single-type file remains single note
- **WHEN** 全部 claims 仅映射到一个 `claim_type`
- **THEN** 系统仅生成 1 个 Note，且该 Note 的 `claim_type` 与 claims 一致

### Requirement: Strict 1:1 flashcard generation per claim

系统 SHALL 为每个 claim 生成且仅生成 1 张卡片。`question` MUST 与 claim 协同生成并避免泄露答案关键词；`answer` MUST 由本地后处理按 `claim + evidence` 拼接，确保可审计与一致性。

#### Scenario: Claim and card count stay equal
- **WHEN** 某 Note 包含 N 条 claims
- **THEN** 生成的卡片数严格为 N，且一一可追溯至来源 claim

#### Scenario: Question does not leak answer keywords
- **WHEN** 系统校验生成 question
- **THEN** question 不包含 claim 断言中的关键答案词，仅保留可考查提示语义
