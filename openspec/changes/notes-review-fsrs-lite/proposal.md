## Why

Phase 1 已具备 ingest 能力，但缺少可闭环的学习界面：用户无法稳定浏览结构化笔记并立即进入闭卷复习。该变更补齐“笔记阅读 + 到期复习 + 评分回写调度”链路，让处理后的知识真正可学习、可复习、可追踪。

## What Changes

- 新增 `/notes` 与 `/notes/:noteId` 端到端体验，接入 `GET /api/notes`，展示结构化 point、目录（ToC）与关联卡片统计。
- 在 note detail 与全局入口提供 `/review` 复习流，支持按 note 作用域筛选到期卡片。
- 新增复习会话行为：先隐藏答案、后揭示答案，提供 Again/Hard/Good/Easy（1-4）评分并提交至 `POST /api/cards/{card_id}/review`。
- 引入 Phase 1 的 FSRS-lite 调度规则，保证 `review_logs`、`fsrs_state`、`next_review` 语义一致且可持久化。
- 统一新增文案为中文并补充 i18n key，避免引入新的英文 UI 文本。

## Capabilities

### New Capabilities

- `knowledge-view`: 覆盖 notes 列表/详情、Markdown+代码块渲染、ToC 与从笔记到复习的入口行为。
- `retention-layer`: 覆盖到期卡获取、复习会话交互、评分提交与 FSRS-lite 调度持久化契约。

### Modified Capabilities

无。

## Impact

- 前端：`projects/entropy-zero` 的 notes/review 页面、路由、i18n 词条、Markdown/CodeBlock 组件与交互状态管理。
- API 消费：`GET /api/notes`、`GET /api/cards/due`、`POST /api/cards/{card_id}/review` 的请求参数与响应处理。
- 数据契约：`review_logs` 与 `fsrs_state` 字段约定（`stability`、`difficulty`、`reps` 等 Phase 1 子集）及 `next_review` 更新语义。
- 测试：补充 notes/detail/review 关键路径 smoke/e2e 检查，重点覆盖移动端布局、筛选行为与评分落库。
