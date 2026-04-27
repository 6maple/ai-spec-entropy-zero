# tasks-observability-api Specification

## Purpose

定义任务列表与详情 API，支撑「任务」页与抽屉，并与 `spec-design.md` §7.5 及设计中的单一事实来源一致。

## Requirements

### Requirement: Paged task list for current user

系统 SHALL 提供 `GET /api/tasks`，支持分页与筛选参数（至少包含与 `spec-design` 一致的 `status`、`raw_id`、`page`、`page_size`、`sort` 语义）。响应 MUST 仅包含当前认证用户的任务，且每条任务的展示状态与 `design.md` 选定的权威来源（`raw_knowledge.status` 及同步任务行）一致。

#### Scenario: List defaults to recent first

- **WHEN** 用户不传 `sort` 而请求第一页
- **THEN** 系统按 `created_at` 倒序（或规范等价字段）返回任务项与分页信息

#### Scenario: Filter by raw_id

- **WHEN** 用户传入与本人相关的 `raw_id`
- **THEN** 响应仅包含与该 raw 关联的处理任务

### Requirement: Task detail by id

系统 SHALL 提供 `GET /api/tasks/{task_id}`，返回单条任务的步骤、进度、状态、错误信息及成功时的结果摘要字段（如 `note_id`、`flashcard_count`），供详情抽屉使用。对不存在或非本人任务 MUST 返回 `404`。

#### Scenario: Detail matches list semantics

- **WHEN** 用户先列表再请求其中某 `task_id` 的详情
- **THEN** 详情中的 `status` 与列表项及对应 `raw_knowledge` 权威状态无矛盾
