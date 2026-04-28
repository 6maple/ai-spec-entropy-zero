# deterministic-processor Specification

## Purpose

定义可替换的非 LLM 处理器契约，与 `spec-design.md` §6.4 及基线「无真实对外 LLM HTTP」一致。

## Requirements

### Requirement: Stable processor input

处理器 SHALL 接受结构化输入，至少包含 `raw_id`、`user_id`、`content`、`file_name`。Worker MUST 从权威库表与队列载荷组装该输入，MUST NOT 信任客户端在处理阶段直传的覆盖字段进行授权决策。

#### Scenario: Invoke with four core fields

- **WHEN** Worker 对一条已门控的 raw 调用处理器
- **THEN** 处理器收到的输入对象包含上述四个字段且与库内一致

### Requirement: Stable processor success output

处理器在成功路径 SHALL 返回 `note_payload`、`card_payloads`、`processing_summary` 的约定结构（字段语义与 `spec-design` §6.4 一致），供服务层映射写入 `notes` 与 `flashcards`。

#### Scenario: Persist notes and cards from payloads

- **WHEN** 处理器返回成功结构且无校验错误
- **THEN** 系统在事务内创建或更新对应笔记与卡片并可将 `raw_knowledge.status` 置为 `processed`

### Requirement: No outbound LLM vendor HTTP

本约束 SHALL 按 `ENTROPY_AGENT` 环境变量区分生效范围：

- 当 `ENTROPY_AGENT=0` 或未设置时，代码路径 MUST NOT 包含向大模型供应商发起的 HTTP 客户端调用；处理器 MUST 为规则或确定性占位实现（与原约束完全一致）。
- 当 `ENTROPY_AGENT=1` 时，AI Agent 路径 MAY 向已配置的 LLM 供应商（阿里云百炼或 Gemini）发起 HTTP 调用；此路径 MUST 通过 `LLMRouter` 封装，不得在 Processor 组件外直接散布 HTTP 客户端代码。

错误路径 SHALL 使用 `error_code`、`error_message`（及可选 `debug_hint`），不得用未定义结构掩盖失败。此约束在两条路径下均适用。

#### Scenario: Reject processor implementation with vendor client outside router

- **WHEN** 代码审查发现针对外部 LLM API 的 HTTP 客户端调用出现在 `LLMRouter` 之外的模块中（如直接在 `ClaimExtractor` 内硬编码 requests 调用）
- **THEN** 该实现 MUST 被拒绝，所有 LLM HTTP 调用必须经由 `LLMRouter`

#### Scenario: Deterministic path unchanged when agent disabled

- **WHEN** `ENTROPY_AGENT=0` 或未设置，且 Worker 触发处理
- **THEN** 系统调用 `run_deterministic_processor`，不发起任何外部 HTTP 调用，行为与 Phase 1 完全一致

#### Scenario: Structured error on processor failure

- **WHEN** 处理器（确定性或 Agent 路径）返回业务错误结构
- **THEN** Worker 将 `raw_knowledge` 置为 `failed` 并持久化可展示的错误摘要
