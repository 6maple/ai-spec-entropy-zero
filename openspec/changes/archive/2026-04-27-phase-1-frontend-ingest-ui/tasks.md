## 1. 路由与 App Shell

- [x] 1.1 引入 `AppShell` 容器并替换仅在 `App.tsx` 顶层包裹 `Header` 的结构，统一 min-height 与背景样式
- [x] 1.2 实现 `TopNav`：56px 粘性顶栏、中部链接 `/`、`/raw`、`/tasks`、`/notes`、`/review`、激活态样式、右侧 zh-CN「上传知识」主按钮跳转 `/upload`
- [x] 1.3 右侧簇：搜索图标占位（toast 即可）、可选通知占位、登出/登录入口与现有 `useAuth` 对齐
- [x] 1.4 小屏：汉堡抽屉承载中部链接，保留上传主按钮始终在顶栏可达
- [x] 1.5 在 `BrowserRouter` 中注册 `/raw`、`/tasks`、`/notes`（及占位策略与 proposal 一致）、`/review` 既有页，确保壳内导航无应用级 404

## 2. i18n（zh-CN）

- [x] 2.1 接入或补齐 i18n Provider，新增本变更涉及的 message key（仅 zh-CN 入仓）
- [x] 2.2 将 App Shell、上传、Raw、Tasks、首页新增/修改的界面文案全部改为 key，校验默认语言为 zh-CN

## 3. API 客户端层

- [x] 3.1 基于 `VITE_API_BASE_URL` 实现共享 fetch（Bearer、JSON、错误解析），与现有前端鉴权方式一致
- [x] 3.2 实现类型化 `rawApi`（上传 multipart、列表、详情、按需触发加工/重试等与后端契约一致的方法）
- [x] 3.3 实现类型化 `tasksApi`（列表、详情、retry 等与 `tasks-observability-api` 对齐）
- [x] 3.4 禁止未在 `CLAUDE.md` 登记的 mock；如需功能开关则通过 env 暴露并在 UI 展现加载/空态

## 4. 页面：`/upload`

- [x] 4.1 拖拽区与文件选择器，`accept=".md"`，校验失败时 zh-CN 提示
- [x] 4.2 调用 `POST` 上传接口，进度与成功/失败态；成功展示 `raw_id` 与跳转 `/raw` 的 CTA
- [x] 4.3 失败时在仍有效前提下保留文件以便重试

## 5. 页面：`/raw`

- [x] 5.1 表格列与筛选（与后端返回字段对齐）、行内状态展示
- [x] 5.2 行操作：处理/重试（按后端可用端点接线）
- [x] 5.3 详情抽屉：非终态展示动态状态；终态展示摘要与跳转笔记等入口（若字段可用）
- [x] 5.4 列表轮询：存在非终态行时每 2–5s refetch，全终态或超时停止（常量与 design 一致）

## 6. 页面：`/tasks`

- [x] 6.1 列表 + 筛选 + 详情抽屉，`note_id` 存在时链到笔记路由
- [x] 6.2 Retry 与后端契约一致；错误与限流以 zh-CN 反馈
- [x] 6.3 非终态任务存在时轮询策略与 `/raw` 一致并在终态/超时停止

## 7. 页面：`/`（首页）

- [x] 7.1 仪表盘卡片：待复习数量（若 API 缺失则降级占位）、最近 raw、最近 tasks、快捷入口与 spec 一致
- [x] 7.2 部分 API 不可用时不抛错，展示空态或占位文案

## 8. 验证与收尾

- [x] 8.1 `pnpm tsc --noEmit` 与 `pnpm build` 通过
- [x] 8.2 按 `test-upload-e2e.md` 或等价清单手测上传 → Raw → Tasks 闭环（本地后端开启时）
