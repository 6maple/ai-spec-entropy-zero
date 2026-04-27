## Why

`spec-design.md` 规定了信息架构与 ingest 闭环：中部导航包含 Home、Raw Library、Tasks、My Notes、Review；右侧主按钮「上传知识」指向 `/upload`。若不单独交付前端壳层与 ingest 页面，用户无法在浏览器内完成上传→加工→可观测的流程，后端 Phase 1 API 也难以被真实使用验证。此前工程基线与后端 ingest 编排已就位，现在是把 **路由、布局、仅有 zh-CN 的 i18n，以及基于轮询的状态界面** 落到 entropy-zero 前端。

## What Changes

- 引入 **AppShell + TopNav**：56px 粘性顶栏、中部路由链接（`/`, `/raw`, `/tasks`, `/notes`, `/review`）、右侧「上传知识」主按钮与移动端抽屉（小屏仍保留上传入口）。
- 交付页面：**`/upload`**（拖拽/选择 `.md`、进度与错误）、**`/raw`**（表格、筛选、行操作、详情抽屉、非终态轮询）、**`/tasks`**（列表、筛选、详情抽屉、与 Proposal 02 契约对齐的重试）、**`/`**（仪表盘卡片与快捷入口）。
- **i18n**：所有用户可见文案走 key，**仅签入 zh-CN**，不以英文为默认展示。
- **API 客户端层**：类型化 `rawApi`、`tasksApi`（其他 API 按需再引，避免无意义的死 mock）。

## Capabilities

### New Capabilities

- `knowledge-ingest-ui`：Phase 1 前端 ingest 闭环相关 UI 与路由（App Shell、上传、Raw 库、任务、首页仪表盘、zh-CN i18n 与轮询策略声明）。与后端 `raw-knowledge-http-api`、`tasks-observability-api` 消费契约对齐，不重新定义 HTTP 语义。

### Modified Capabilities

- （无）本变更增加新的 UI 规格能力；不修改现有 OpenSpec 中后端能力的需求文本。

## Impact

- **代码**：`projects/entropy-zero/frontend/`（路由、布局、页面、组件、API 客户端、i18n）。
- **依赖**：依赖 Phase 1 已注册的后端 API（见 `CLAUDE.md`）；若接口未就绪，使用功能开关或加载态，**禁止**引入未登记的 mock。
- **系统**：无数据库迁移；无新后端服务。
