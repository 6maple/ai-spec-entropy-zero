# 用户认证模块改造提案（Supabase）

## 1. 结论（基于当前代码）

当前项目**不支持完整的“用户注册 + 登录”流程**。

### 1.1 现状证据

- 前端 `LoginPage.tsx` 仅展示静态文案，没有表单提交、没有 `signIn` / `signUp` 调用。
- 前端 `useAuth.ts` 仅做：
  - `supabase.auth.getSession()` 读取现有会话
  - `onAuthStateChange` 监听状态
  - `signOut` 退出
- 前端 `supabase.ts` 在缺少 Supabase 配置时启用 `noopAuth`，仅提供 `getSession/onAuthStateChange/signOut` 的空实现，不含注册/登录能力。
- 后端 `deps.py` 仅做 JWT 校验（`Authorization: Bearer`），无注册/登录 API（这一点是合理的，认证应由 Supabase Auth 承担）。
- 当前本地开发主要依赖 `VITE_DEV_ACCESS_TOKEN + DEV_JWT_SECRET` 走“开发令牌”路径，而非真实用户认证闭环。

## 2. 目标与范围

### 2.1 目标

1. 基于 Supabase Auth 实现真实的用户注册、登录、退出。
2. 支持两种开发连接模式可切换：
   - 本地 PostgreSQL（后端 `DATABASE_URL`）
   - Supabase 云（后端 `DATABASE_URL` 指向 Supabase PG，前端 Supabase Auth 正常登录）
3. 保持后端鉴权模型不变：继续使用 JWT `sub` 作为 `user_id`。
4. 不引入自建账号密码表，不自建密码管理逻辑。

### 2.2 非目标

- 本提案不改 Agent/处理流程。
- 本提案不新增 OAuth 第三方登录（可留后续）。
- 本提案不改 RLS 策略（如已有策略不满足再单独补提案）。

## 3. 设计方案

### 3.1 架构原则

- **认证交给 Supabase Auth**（前端直连 Supabase JS SDK）。
- **业务数据交给后端 API**（FastAPI + SQLAlchemy）。
- **后端只验 token，不发 token**：避免认证逻辑分叉。

### 3.2 前端改造

1. 重写 `LoginPage` 为真实认证页：
   - 注册（email + password）`supabase.auth.signUp`
   - 登录（email + password）`supabase.auth.signInWithPassword`
   - 明确错误提示（邮箱已注册、密码错误、邮箱未验证等）
2. 新增认证路由守卫：
   - `RequireAuth`：未登录跳转 `/auth/login`
   - `RequireGuest`：已登录访问登录页时跳转首页
3. `useAuth` 扩展：
   - 暴露 `signIn/signUp/signOut`
   - 统一 loading/error 状态
4. `getAccessToken` 保持兼容：
   - 开发态允许 `VITE_DEV_ACCESS_TOKEN`（便于纯后端联调）
   - 正常态优先使用 Supabase session token
5. i18n 文案补齐：
   - 注册/登录按钮、表单校验、错误提示全部简体中文。

### 3.3 后端改造

1. 保持现有 `deps.py` JWT 校验主逻辑。
2. 增加更清晰的配置策略：
   - `AUTH_MODE=supabase|dev_token`（可选，默认 `supabase`）
   - `dev_token` 模式下允许 `DEV_JWT_SECRET`
3. 在日志中输出当前鉴权模式（启动时一次），便于排障。
4. 不新增 `/register`、`/login` API，避免与 Supabase Auth 重叠。

### 3.4 环境切换策略（关键）

#### 模式 A：本地 PostgreSQL + Supabase Auth（推荐本地完整联调）

- 前端：
  - `VITE_SUPABASE_URL=<cloud supabase>`
  - `VITE_SUPABASE_ANON_KEY=<anon key>`
  - `VITE_API_BASE_URL=http://localhost:8173/api`
- 后端：
  - `DATABASE_URL=postgresql://localhost:5432/entropy_zero`（或 asyncpg 形式）
  - `SUPABASE_JWT_SECRET=<同一 supabase 项目 jwt secret>`

效果：用户在 Supabase 登录，token 访问本地后端，本地数据库存业务数据。

#### 模式 B：Supabase 云 PostgreSQL + Supabase Auth（接近生产）

- 前端同模式 A
- 后端：
  - `DATABASE_URL=<supabase postgres connection string>`
  - `SUPABASE_JWT_SECRET=<同一 supabase 项目 jwt secret>`

效果：认证与数据都走 Supabase 云，最接近线上。

#### 模式 C：本地快速开发（保留兼容）

- 前端：
  - `VITE_DEV_ACCESS_TOKEN=<本地签发 token>`
- 后端：
  - `DEV_JWT_SECRET=<本地密钥>`

效果：跳过真实注册/登录，仅用于接口调试，不作为默认开发流程。

## 4. 详细实施任务

1. 前端认证能力
   - [ ] `LoginPage` 实现注册/登录 tab + 表单 + 调用 Supabase SDK
   - [ ] `useAuth` 扩展 `signIn/signUp`，统一状态管理
   - [ ] `App.tsx` 接入路由守卫（受保护页）
2. Token 获取与容错
   - [ ] `getAccessToken` 明确优先级（dev token / session token）
   - [ ] 未登录时的统一错误交互（提示并跳转登录）
3. 后端鉴权模式
   - [ ] 在 `deps.py` 增加鉴权模式配置与启动日志
   - [ ] 补充异常提示（secret 缺失、aud 错误、sub 缺失）
4. 配置文档与示例
   - [ ] 更新 `frontend/.env.example`
   - [ ] 更新 `backend/.env.example`
   - [ ] 在 `project.md` 增加“认证与环境切换”章节
5. 测试与验收
   - [ ] 前端：登录态切换、路由保护、退出后回跳
   - [ ] 后端：JWT 校验单测（有效 token/无效 token/错误 secret）
   - [ ] E2E：注册 -> 登录 -> 调用受保护 API -> 退出

## 5. 验收标准（DoD）

1. 新用户可在 `/auth/login` 完成注册并登录成功。
2. 未登录访问 `/raw`、`/tasks`、`/notes` 会被重定向到登录页。
3. 登录后可正常调用后端受保护接口，401 率无异常。
4. 在“本地 PostgreSQL”与“Supabase 云 PostgreSQL”两种模式中，认证流程都可用。
5. `DEV_TOKEN` 模式仍可用于快速开发，不影响 Supabase 模式。

## 6. 风险与应对

- 风险：本地后端与 Supabase 项目 `JWT secret` 不一致，导致大量 401。  
  应对：启动日志打印“鉴权模式+secret来源（不打印明文）”。
- 风险：前端未配置 Supabase 时误走 `noopAuth`，用户以为系统可登录。  
  应对：登录页明确提示“缺少 Supabase 配置”，并禁用提交按钮。
- 风险：开发者混淆模式（A/B/C）导致调试时间增加。  
  应对：在文档提供三套复制即用的 `.env` 示例片段。

## 7. 里程碑建议

- M1（0.5 天）：前端登录页 + `useAuth` 扩展 + 基础路由守卫
- M2（0.5 天）：后端鉴权模式整理 + 异常处理 + 单测
- M3（0.5 天）：文档、联调、验收脚本

---

该提案优先解决“现在无法真实注册登录”的核心问题，并保留现有开发令牌能力，确保你在本地和云环境都能低成本切换与联调。
