## MODIFIED Requirements

### Requirement: Redis queue operations

系统 SHALL 保持现有队列抽象语义（`enqueue/dequeue/ack/nack`），并确保入队载荷可让 Worker 在消费时定位 `raw_id` 与关联任务。持久化成功后 ACK，失败按可重试语义 NACK。

#### Scenario: Enqueue provides processing identity
- **WHEN** API 创建处理任务并入队
- **THEN** 队列消息包含可定位原始文档与任务状态的最小身份字段

#### Scenario: Ack after successful extended persistence
- **WHEN** Worker 完成包含 `meta_tag_json`、`notes.claim_type` 与卡片写入的事务
- **THEN** 系统对该任务执行 ACK，避免重复消费

### Requirement: Worker runs outside API request lifecycle

Worker 处理流程 MUST 在独立进程中运行，并在消费后完成状态校验、调用处理器、事务写回与 ack/nack。写回阶段 MUST 扩展支持文档级 `meta_tag` 与 note 级 `claim_type` 的持久化。

#### Scenario: Worker persists meta tag and claim type
- **WHEN** Worker 收到 Agent 成功结果
- **THEN** 系统将文档级 `meta_tag` 写入 `raw_knowledge`，并将每个 Note 的 `claim_type` 写入 notes 表

#### Scenario: Failure keeps boundary and state integrity
- **WHEN** 处理器失败或写库失败
- **THEN** 系统在边界内写入失败状态与错误摘要，再按策略执行 ACK 或 NACK
