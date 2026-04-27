# raw-knowledge-http-api Specification

## Purpose

定义原始 Markdown 摄入与处理触发的 HTTP 行为，与 `spec-design.md` §7.2、§6.3 一致。

## Requirements

### Requirement: Multipart upload of Markdown only

系统 SHALL 仅通过 `POST /api/raw/upload` 接受 `multipart/form-data`，字段名为 `file`，且文件 MUST 为 `.md`（按文件名或等价规则校验）。系统 SHALL 将正文按 UTF-8 解码写入存储，并对 `file_name` 做长度与路径穿越安全处理。非法扩展名、空文件、非 multipart、解码失败 MUST 返回 `4xx` 且不创建 `raw_knowledge` 行；合法上传 MUST 创建 `pending` 状态记录。

#### Scenario: Successful upload creates pending row

- **WHEN** 客户端以 `multipart/form-data` 上传非空 `.md` 文件且鉴权通过
- **THEN** 系统返回 `201` 且响应体包含 `raw_id`、`status` 为 `pending` 及 `created_at`

#### Scenario: Reject non-md without persisting

- **WHEN** 上传文件扩展名或类型判定不是允许的 Markdown 文件
- **THEN** 系统返回 `4xx` 且不写入 `raw_knowledge` 行

### Requirement: List and detail raw knowledge

系统 SHALL 提供 `GET /api/raw`，支持查询参数 `status`、`keyword`、`page`、`page_size`（名称与分页语义与 `spec-design` 对齐），且仅返回当前认证用户的数据。系统 SHALL 提供 `GET /api/raw/{raw_id}`，返回详情含状态、错误摘要及规范要求的衍生计数；对不存在或非本人资源 MUST 返回 `404`。

#### Scenario: List filtered by status

- **WHEN** 用户请求列表并传入合法 `status` 筛选
- **THEN** 响应仅包含该状态下属于该用户的记录及分页元数据

#### Scenario: Detail forbids cross-user access

- **WHEN** 用户请求他人 `raw_id` 的详情
- **THEN** 系统返回 `404`

### Requirement: Process trigger is state-gated and idempotent

系统 SHALL 提供 `POST /api/raw/{raw_id}/process`，仅当当前 `raw_knowledge.status` 为 `pending` 或 `failed` 时允许进入 `processing` 并入队；当状态为 `processing` 或 `processed` 时 MUST 拒绝重复入队（如 `409`/`423`，与 `spec-design` 错误表一致）。成功接受处理 MUST 返回 `202`（或规范约定等价状态）且响应包含 `task_id` 与更新后的处理状态。

#### Scenario: Accept process from pending

- **WHEN** 资源处于 `pending` 且请求合法
- **THEN** 系统原子将状态迁移为可处理的 `processing`（按实现与 spec 一致）、入队并返回 `task_id`

#### Scenario: Reject duplicate enqueue while processing

- **WHEN** 同一 `raw_id` 已为 `processing`
- **THEN** 系统拒绝再次入队且不破坏已在执行的任务
