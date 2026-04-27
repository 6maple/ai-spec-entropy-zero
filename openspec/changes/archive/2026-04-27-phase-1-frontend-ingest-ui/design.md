## Context

Phase 1 后端已具备 Raw 上传、任务可观测与 Bearer 鉴权等契约（OpenSpec：`raw-knowledge-http-api`、`tasks-observability-api` 等）。前端当前为早期壳层（`Header`、`UploadPage` 等），路由与信息架构尚未完全对齐 `spec-design.md`（中部导航五链、右侧「上传知识」、Raw/Tasks 列表与轮询）。本变更在前端交付 **App Shell、完整路由表、上传/原始库/任务/首页**，并以 **zh-CN i18n** 与 **HTTP 轮询** 闭合 ingest 可操作路径。

## Goals / Non-Goals

**Goals:**

- 粘性 **56px** 顶栏、中部导航、`/upload` 主按钮与移动端抽屉（小屏保留上传）。
- `/upload`、`/raw`、`/tasks`、`/` 页面能力达到 proposal 与 `knowledge-ingest-ui` 规格描述。
- Raw 与 Tasks 列表在存在非终态项时轮询刷新，达到终态或超时后停止（间隔与上限对齐 `spec-design.md` §9.1）。
- `rawApi` / `tasksApi`（及共享 fetch 配置）类型化封装，错误与鉴权行为与后端契约一致。
- 用户可见文案全部走 i18n key，**仅提交 zh-CN**。

**Non-Goals:**

- 笔记详情渲染、Markdown 流水线、FSRS 复习交互（Proposal 04）。
- 服务端搜索、WebSocket/SSE 实时推送。
- 新增未在 `CLAUDE.md` 登记的 API mock。

## Decisions

1. **壳层命名与结构**  
   - **采用 `AppShell` + `TopNav`**（可将现有 `Header` 演进合并，避免两套顶栏）。  
   - **理由**：与提案术语一致，便于任务拆分；备选「仅扩展 Header」可行但易导致职责膨胀。

2. **路由与鉴权**  
   - **规格定义的路由 SHALL 注册**，避免占位 404；登录态由现有 `useAuth` 守卫（与 Phase 1 一致：未登录可导向登录或受保护路由策略在实现中与 `CLAUDE.md` 对齐）。  
   - **理由**：先保证 IA 可达性；严鉴权细节不重复后端规格，仅在前端一致使用 `Authorization: Bearer`。

3. **轮询**  
   - **间隔 2–5s**（默认取中间值或可配置常量），**终态立即停止**；**超时**后停止轮询并呈现可刷新提示（具体秒数与 `spec-design.md`/任务页一致）。  
   - **理由**：规范已写死数量级；React Query/SWR 若已在依赖中则优先，否则 `setInterval` + 卸载清理亦可。  
   - **备选**：纯手动刷新——不满足「可操作闭环」验收。

4. **API 未就绪**  
   - **环境变量或功能开关**控制是否发起真实请求；加载/空态/错误态必须可区分。  
   - **禁止**引入未注册 mock；若必须 fake，先更新 `CLAUDE.md` 登记。

5. **i18n**  
   - **单语 zh-CN**：使用项目现有 i18n 方案（若尚无，引入轻量 `react-i18next` 或简单 message map，以 proposal 为准优先与代码库一致）。  
   - **理由**：Phase 1 明确要求无英文默认 UI。

## Risks / Trade-offs

- **[Risk] 后端字段与 UI 表格列不完全一致** → **Mitigation**：类型与列定义以 OpenAPI/`schemas` 与现有 `raw_knowledge`/`tasks` 路由为准；列可隐藏不可数字段。  
- **[Risk] 双源状态（列表 vs 详情）** → **Mitigation**：加工状态以 Proposal 02 约定的「唯一真值」字段为准（与后端 `design.md` 一致），详情抽屉从同次 refetch 或失效策略拉齐。  
- **[Risk] 轮询放大请求量** → **Mitigation**：仅当存在非终态行时轮询；页签不可见时可降频或暂停（可选优化，不阻塞 MVP）。

## Migration Plan

- **部署**：纯前端静态资源发布，无 DB 迁移。  
- **回滚**：还原上一前端构建；无数据迁移风险。  
- **兼容**：旧书签 `/upload` 保留；新增 `/raw`、`/tasks` 路由。

## Open Questions

- 首页仪表盘「待复习数量」数据源是否在 Phase 1 已有可用 API；若无，首页卡片是否显示占位与「即将推出」（需与产品确认）。  
- 未登录用户访问 `/raw`、`/tasks` 是重定向登录还是只读占位（以实现时 `useAuth` 策略为准）。
