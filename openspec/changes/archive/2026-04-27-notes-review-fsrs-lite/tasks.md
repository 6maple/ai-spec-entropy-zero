## 1. API contract and route wiring

- [x] 1.1 确认并统一 `/review` 作用域参数契约（`scope` 与 `noteId`/`note_id`）并更新前端请求封装。
- [x] 1.2 接入 `GET /api/notes` 列表查询参数（`raw_id`、`tag`、`keyword`）与错误/空态处理。
- [x] 1.3 接入 `GET /api/cards/due` 全局与 note 作用域拉取逻辑，默认仅取到期卡片。
- [x] 1.4 接入 `POST /api/cards/{card_id}/review` 提交结构（rating、reviewed_at）并定义失败回退策略。

## 2. Notes reading experience

- [x] 2.1 实现 `/notes` 页面列表展示与中文空态 CTA（跳转 raw 上传或 raw 列表）。
- [x] 2.2 实现 `/notes/:noteId` 页面基础布局：头部元信息、PointCard 列表、侧栏统计。
- [x] 2.3 实现 H2/H3 ToC 生成与锚点跳转，验证长内容滚动下的可用性。
- [x] 2.4 实现移动端侧栏折叠/重排，确保小屏下无遮挡与不可点击区域。

## 3. Markdown and CodeBlock safety UX

- [x] 3.1 建立 markdown 渲染白名单/清洗策略，禁止不安全 HTML 注入。
- [x] 3.2 实现统一代码块渲染（语法高亮、mac 风格顶栏可选、复制按钮）。
- [x] 3.3 实现复制成功 checkmark 与失败 toast 反馈，并补充可访问性标签。

## 4. Review flow and FSRS-lite persistence

- [x] 4.1 实现复习卡“先隐藏答案、后揭示答案”交互状态机。
- [x] 4.2 实现 Again/Hard/Good/Easy 的中文标签与 1-4 数值映射。
- [x] 4.3 以服务端响应为准更新本地队列，确保 `next_review` 与 `fsrs_state` 同步。
- [x] 4.4 实现 FSRS-lite 最小字段更新（`stability`、`difficulty`、`reps`）并记录 `review_logs`。
- [x] 4.5 在项目文档中明确 FSRS-lite 与完整 FSRS 的限制和非目标。

## 5. Quality and rollout checks

- [x] 5.1 补充 i18n key，确保新增 UI 文案无英文硬编码。
- [x] 5.2 添加 notes->detail->review 主链路 smoke/e2e 用例。
- [x] 5.3 添加复习评分后 `next_review` 变化与落库校验用例。
- [x] 5.4 进行移动端布局回归与异常请求回归，记录发布与回滚步骤。
