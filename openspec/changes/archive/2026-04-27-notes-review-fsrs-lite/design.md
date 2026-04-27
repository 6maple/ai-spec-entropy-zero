## Context

当前 Phase 1 已完成原始知识处理链路，数据库中可落地 `notes` 与 `flashcards`，但前端学习闭环尚未成型：用户无法稳定地从笔记阅读进入复习，也无法通过标准评分动作驱动下一次复习时间。该变更横跨前端路由/UI、Markdown 渲染安全策略、复习 API 消费与调度状态持久化，属于典型跨模块集成改造。

约束与前提：
- 产品行为以 `工作台/项目文档/phase-1/spec-design.md` 为准，尤其是 notes detail 布局、移动端退化与 review 评分语义。
- Phase 1 只要求 FSRS-lite，可与完整 FSRS 在结果上存在差异，但字段形状必须兼容 `fsrs_state` 持久化结构。
- 新增界面文案默认中文，必须通过 i18n key 管理，避免硬编码英文字符串。

## Goals / Non-Goals

**Goals:**
- 建立 `/notes` -> `/notes/:noteId` -> `/review` 的连贯学习路径，支持全局与 note 作用域复习。
- 在 note detail 提供稳定的 Markdown/代码块阅读体验（含 ToC、复制反馈、错误提示）。
- 将复习评分（1-4）稳定映射到 Again/Hard/Good/Easy，并通过后端返回值更新 `next_review` 与本地队列。
- 在不引入复杂算法实现的前提下完成 FSRS-lite 调度，保证 `review_logs`、`fsrs_state`、`next_review` 契约一致。

**Non-Goals:**
- 不改造 raw 上传与处理队列内部机制。
- 不追求与 Anki/完整 FSRS 的间隔一致性。
- 不在本变更中扩展社交、分享、协作能力。
- 认证只做必要打通，不做 auth 体验全面重构。

## Decisions

1. Notes 与 Review 采用“页面级容器 + 组件级渲染”分层
- 决策：在页面层管理 API 请求、筛选与错误态，在 `PointCard` / `CodeBlock` / `ReviewCard` 等组件层处理纯展示与交互细节。
- 原因：降低耦合，便于后续替换数据源或新增筛选项。
- 备选方案：将请求逻辑下沉到每个组件。未采用，因会导致请求重复与状态分散。

2. Review 作用域通过显式 query contract 传递
- 决策：`/review` 支持 `scope=global|note` 与 `noteId`（或后端约定的同义参数），note detail CTA 统一带上 note 作用域参数。
- 原因：URL 可分享、可回放，且便于测试覆盖筛选行为。
- 备选方案：使用全局 store 暂存 scope。未采用，因刷新后状态丢失且不利于定位问题。

3. Markdown 渲染采用“白名单 + 统一 CodeBlock”
- 决策：Markdown 仅允许安全标签/属性，代码块统一走高亮组件并提供复制按钮、成功勾选与失败 toast。
- 原因：同时满足可读性与 XSS 风险控制，避免页面直接渲染不可信 HTML。
- 备选方案：原样渲染 HTML。未采用，安全风险不可接受。

4. 复习提交采用“以服务端为准”的更新策略
- 决策：`POST /api/cards/{card_id}/review` 后使用响应中的最新卡片状态（尤其 `next_review`）更新本地队列；失败时回滚乐观状态或触发局部重取。
- 原因：调度逻辑在服务端，客户端不复制调度真值，减少漂移。
- 备选方案：客户端本地计算后再与服务端对账。未采用，复杂度高且易产生不一致。

5. FSRS-lite 采取“最小字段 + 可扩展公式”
- 决策：阶段内仅强制维护 `stability`、`difficulty`、`reps` 与 `next_review`，评分驱动固定规则更新；在设计文档和规格中明确与完整 FSRS 的差异。
- 原因：满足 Phase 1 可用性目标，同时保留后续升级路径。
- 备选方案：一次性实现完整 FSRS。未采用，超出阶段范围并增加验证成本。

## Risks / Trade-offs

- [Markdown 安全策略过严导致展示受限] -> 通过最小白名单起步，并在测试样例中覆盖常见 markdown 结构（标题、列表、代码、链接）。
- [FSRS-lite 与用户预期存在偏差] -> 在产品文案与设计说明中明确“Phase 1 简化调度”，并保证评分后可观察到 `next_review` 变化。
- [复习队列并发更新导致 UI 抖动] -> 采用提交按钮短暂禁用与单卡串行提交，必要时按卡片粒度重取。
- [note 作用域参数约定不一致] -> 在规格中固定参数名和优先级，并在前后端联调测试中校验。

## Migration Plan

1. 先落地 `knowledge-view` 与 `retention-layer` 的 spec，固定 API/交互契约。  
2. 按任务顺序实现前端页面与 API 接线，再接入 FSRS-lite 回写路径。  
3. 补齐 smoke/e2e 用例（notes 渲染、作用域筛选、评分后 `next_review` 更新）。  
4. 灰度验证：以开发/测试环境真实数据验证移动端布局与复习闭环。  
5. 回滚策略：若 review 回写异常，暂时关闭 note 入口到 scoped review，仅保留全局复习入口并回退到上一稳定前端版本。  

## Open Questions

- `/api/cards/due` 的 note 作用域参数最终命名是 `note_id` 还是 `noteId`，是否同时兼容。
- 评分提交响应是否总是返回最新 `fsrs_state` 与 `next_review`，若不是则需要补充最小返回字段契约。
- 当前认证状态下，`/review` 是否必须强制登录访问，还是允许开发环境受控绕过。
