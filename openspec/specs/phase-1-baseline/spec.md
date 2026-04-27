# phase-1-baseline Specification

## Purpose
TBD - created by archiving change phase-1-engineering-baseline. Update Purpose after archive.
## Requirements
### Requirement: Authoritative documentation hierarchy

Phase 1 工作流 MUST 将下列文档作为权威引用；当叙述冲突时，以 `工作台/项目文档/phase-1/spec-design.md` 为最高优先级产品事实来源。

#### Scenario: Resolving conflicting guidance

- **WHEN** 某 OpenSpec 变更、实现或评审中的描述与 `spec-design.md` 不一致
- **THEN** 以 `spec-design.md` 为准并修正其他材料中的矛盾叙述

#### Scenario: Engineering constraints source

- **WHEN** 需要确认工具链、Mock 登记、最小改动面等工程约定
- **THEN** 以 `projects/entropy-zero/CLAUDE.md` 为工程约束来源并与 `spec-design.md` 对齐

### Requirement: Application root and migrations

应用实现代码与数据库迁移 MUST 位于 `projects/entropy-zero/` 下（含前端、后端及 `database/migrations/`），除非 `spec-design.md` 明确变更该结构。

#### Scenario: Locating runtime and schema changes

- **WHEN** 贡献者添加 Phase 1 功能或迁移
- **THEN** 变更 MUST 落在 `projects/entropy-zero/` 及其约定子路径内

### Requirement: Toolchain and local environment

开发环境 MUST 满足：前端使用 **pnpm** 与 **Node.js 20+**；后端使用 **Python 3.12** 与 **uv**（依赖安装与运行通过 `uv sync`、`uv run`）；本地数据依赖 **PostgreSQL** 与 **Redis**，凭据来自本地 `.env` 且 MUST NOT 提交密钥。

#### Scenario: Frontend toolchain compliance

- **WHEN** 在仓库内安装或运行 Phase 1 前端
- **THEN** 使用 pnpm 且 Node 主版本 SHALL 为 20 或以上

#### Scenario: Backend toolchain compliance

- **WHEN** 在仓库内安装或运行 Phase 1 后端
- **THEN** 使用 Python 3.12 与 uv 管理依赖与命令执行

### Requirement: Production deployment constraints

生产部署 MUST 与既定栈一致：**Vercel**、**Supabase**；若使用 Redis 缓存类能力则与 **Upstash Redis** 等既定方案一致。源代码 MUST NOT 硬编码生产环境密钥。

#### Scenario: No hardcoded production secrets

- **WHEN** 审查或合并涉及环境配置的代码
- **THEN** 不得将生产密钥硬编码于源码中

### Requirement: Default locale and internationalization posture

产品默认用户体验文案 MUST 为中文；实现 SHALL 保持 **i18n 可扩展**，但 Phase 1 默认交付 MUST NOT 将英文语言包作为默认必发内容。

#### Scenario: Shipped default language

- **WHEN** 发布 Phase 1 默认构建
- **THEN** 面向用户的默认文案为中文（zh-CN），且不依赖英文 bundle 作为默认交付物

### Requirement: Markdown ingestion transport

Markdown 摄入 MUST 仅通过 **`.md` 文件 multipart 上传**；MUST NOT 将「大段 Markdown 粘贴进应用并保存」或「以 JSON body 承载原始 Markdown 正文」作为规格规定的摄入方式。

#### Scenario: Accepted upload path

- **WHEN** 用户提交待处理的 Markdown 源内容
- **THEN** 系统通过 multipart 文件字段接受 `.md` 文件

#### Scenario: Rejected alternate transports for raw markdown

- **WHEN** 设计或实现提议用 JSON body 或应用内大文本框保存原始 Markdown 作为唯一摄入路径
- **THEN** 该方案 MUST 被拒绝或与 `spec-design.md` 修订同步后再采纳

### Requirement: No real outbound LLM HTTP in Phase 1

Phase 1 处理管线 MUST NOT 发起真实的对外 LLM HTTP 调用；处理 MUST 使用可替换的非 LLM 处理器（规则或内部占位实现）。MUST NOT 为实现 Phase 1 而落地真实供应商 API 客户端代码。

#### Scenario: Processing without vendor LLM calls

- **WHEN** 执行文档处理或生成类任务
- **THEN** 不依赖对外 LLM HTTP 请求即可完成既定 Phase 1 行为

### Requirement: Mock registry discipline

除最小必要外，MUST 避免引入 Mock；任何被接受的 Mock MUST 在 `projects/entropy-zero/CLAUDE.md` 的 Mock 登记机制中登记，以便审计与移除。

#### Scenario: Introducing a required mock

- **WHEN** 变更需要引入或保留测试/开发用 Mock
- **THEN** 该 Mock MUST 已在 `CLAUDE.md` Mock 登记中记录

### Requirement: Minimal blast radius for code changes

代码修改 MUST 限于当前任务所需的模块与函数；对共享代码的修改 MUST NOT 破坏无关调用方（与 `CLAUDE.md` 中「最小影响面」原则一致）。

#### Scenario: Shared module edit

- **WHEN** 修改共享模块或公共 API
- **THEN** 变更范围 MUST 与当前任务相关且保持其他调用方行为不变或已显式迁移

### Requirement: Phase 1 OpenSpec change preamble

每个 Phase 1 的 OpenSpec 变更在其 **proposal.md 或 design.md 前言** MUST 显式引用下列三份路径（以仓库相对路径书写）：`工作台/项目文档/phase-1/phase-1-propose-01.md`、`工作台/项目文档/phase-1/spec-design.md`、`projects/entropy-zero/CLAUDE.md`。

#### Scenario: New Phase 1 change authored

- **WHEN** 创建新的 Phase 1 OpenSpec 变更文档
- **THEN** proposal 或 design 前言中包含上述三份引用

### Requirement: Explicit exclusions for all Phase 1 proposals

Phase 1 提案集合 MUST 将以下项视为明确排除，除非 `spec-design.md` 修订：真实 OpenAI/OpenRouter 等集成；WebSocket/SSE 实时（除非规格改为轮询以外方案）；英文作为默认发货语言；与当前变更无关的广泛重构。

#### Scenario: Scope challenge against exclusions

- **WHEN** 某实现提议属于上述排除项之一
- **THEN** 该提议 MUST 被拒绝或必须先升级 `spec-design.md` 与相关 OpenSpec 变更

### Requirement: Proposal dependency ordering

实施依赖关系 MUST 遵循：`phase-1-propose-02`（后端摄入与任务 API）为 `phase-1-propose-03`（前端壳与 `/upload` `/raw` `/tasks`）的上游；`phase-1-propose-04`（笔记、卡片、复习）在功能完整意义上依赖 02 的处理器路径已持久化 `notes` 与 `flashcards`。OpenSpec 变更 ID 建议与 Proposal 02–04 表格一致（`phase-1-backend-ingest-orchestration`、`phase-1-frontend-shell-ingest-ui`、`phase-1-notes-cards-review`）。

#### Scenario: Frontend depends on backend contract

- **WHEN** 实现前端上传与任务轮询与规格相关能力
- **THEN** 后端契约（Proposal 02 范围）已定义或可并行仅搭建脚手架，但不得假设与 02 冲突的 API 形态

#### Scenario: Notes and cards feature completeness

- **WHEN** 将 Proposal 04 标记为功能完整（非仅脚手架）
- **THEN** Proposal 02 路径 MUST 已按规格持久化 notes 与 flashcards

