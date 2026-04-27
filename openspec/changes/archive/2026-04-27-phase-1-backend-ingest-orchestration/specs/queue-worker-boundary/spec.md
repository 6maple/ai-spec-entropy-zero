# queue-worker-boundary Specification

## Purpose

定义队列抽象与 Worker 执行边界，使 API 与消费逻辑解耦，并满足 `spec-design.md` §6.5。

## ADDED Requirements

### Requirement: Redis queue operations

系统 SHALL 提供队列抽象，至少包含 `enqueue(job)`、`dequeue()`、`ack(job)`、`nack(job, retryable)` 语义。实现 MUST 使用环境可配置的 Redis 客户端（本地开发 Redis、生产 Upstash 等与基线一致），且 MUST NOT 在源码中硬编码生产密钥。

#### Scenario: Enqueue carries job identity

- **WHEN** API 在处理入口成功将 raw 置为可执行状态后调用入队
- **THEN** 队列中持久化足以让 Worker 定位 `raw_id`（及关联 `user_id`/任务元数据）的载荷

#### Scenario: Ack after successful persistence

- **WHEN** Worker 完成写库与状态提交且业务成功
- **THEN** 系统对对应任务执行 `ack`，任务不再被投递

### Requirement: Worker runs outside API request lifecycle

Worker 处理流程 MUST 在 **独立进程**（或项目明确约定的等价常驻入口）中运行，执行 `dequeue`、状态二次校验、调用处理器、事务写回 `notes`/`flashcards`/`raw_knowledge` 与 ack/nack。API 路由处理函数 MUST NOT 依赖单次 HTTP 请求内阻塞完成整条管线。

#### Scenario: Worker validates state before processing

- **WHEN** Worker 从队列取出任务
- **THEN** 系统在写处理器前再次校验 `raw_knowledge` 状态与归属，不满足时安全 nack 或跳过并记录

#### Scenario: Failure updates raw to failed

- **WHEN** 处理器返回错误或持久化失败且不可恢复
- **THEN** 系统将 `raw_knowledge.status` 置为 `failed` 并写入错误摘要，随后 ack 或按重试策略 nack
