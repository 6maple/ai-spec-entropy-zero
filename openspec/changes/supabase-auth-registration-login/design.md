## Context

当前前端认证仅覆盖“读取 session + 退出登录”，`/auth/login` 仍为静态占位页；后端已具备 Bearer JWT 校验能力，但本地开发大量依赖 `VITE_DEV_ACCESS_TOKEN` 的临时链路。项目需要在不引入自建账号体系的前提下，完成 Supabase Auth 的注册/登录闭环，同时保持本地 PostgreSQL 与 Supabase 云 PostgreSQL 两种数据连接模式可切换。

约束如下：
- 认证统一由 Supabase Auth 提供，后端不新增登录/注册 API。
- 受保护业务 API 继续通过 `Authorization: Bearer <token>` 访问。
- 用户可见文案使用简体中文。
- 需要兼容开发态 `dev token` 调试路径，避免影响现有联调效率。

## Goals / Non-Goals

**Goals:**
- 提供可用的邮箱注册、密码登录、退出登录用户流程。
- 在路由层实现明确的登录态守卫：未登录拦截业务页，已登录拦截登录页。
- 明确后端鉴权模式（`supabase` / `dev_token`）与配置优先级，并提升可观测性。
- 沉淀环境切换文档，使“本地 DB + 云认证”与“云 DB + 云认证”都可稳定联调。

**Non-Goals:**
- 不引入 OAuth 第三方登录。
- 不改动 Agent、Worker、知识处理主流程。
- 不新增自建用户表、密码哈希或会话管理服务。
- 不在本次变更中重构 RLS 策略（除非后续独立提案要求）。

## Decisions

### 1) 认证边界：前端直连 Supabase Auth，后端仅验证 JWT

- 方案：前端通过 `supabase-js` 执行 `signUp`、`signInWithPassword`、`signOut`，后端继续仅做 JWT 验签并提取 `sub` 作为 `user_id`。
- 理由：避免重复实现认证系统，降低安全风险与维护成本；与现有 Bearer 架构一致。
- 备选：
  - 自建 `/login` `/register` API：安全与维护成本高，且与 Supabase 重叠。
  - 后端代理 Supabase Auth：引入额外复杂度，收益有限。

### 2) 路由守卫：引入双向守卫组件

- 方案：新增 `RequireAuth` 与 `RequireGuest`。
  - `RequireAuth`：用于 `/raw`、`/tasks`、`/notes`、`/review`、`/upload` 等业务路由。
  - `RequireGuest`：用于 `/auth/login`，已登录用户自动回到首页。
- 理由：显式化访问控制，减少页面内部重复鉴权判断。
- 备选：在每个页面内手写跳转逻辑，重复且易遗漏。

### 3) Token 来源优先级：默认 session token，保留 dev token 兜底

- 方案：`getAccessToken` 在开发态可使用 `VITE_DEV_ACCESS_TOKEN`，否则读取 Supabase session access token。
- 理由：保证真实认证为默认路径，同时不破坏现有后端独立联调模式。
- 备选：完全移除 dev token，会影响无 Supabase 配置场景下的调试效率。

### 4) 后端鉴权模式：显式配置 + 启动日志

- 方案：在 `deps.py` 中支持 `AUTH_MODE=supabase|dev_token`（默认 `supabase`），并在启动时记录当前模式与密钥来源（不输出密钥值）。
- 理由：减少“密钥配错导致 401”排障成本，避免隐式配置造成歧义。
- 备选：继续仅按环境变量是否存在自动推断，排障信息不足。

### 5) 环境切换：统一“认证不变、数据库可变”的策略

- 方案：无论本地还是云数据库，认证都走同一 Supabase 项目 JWT（或显式 dev_token 模式）；只切换 `DATABASE_URL` 指向。
- 理由：保证 token 语义一致，降低跨环境行为差异。
- 备选：不同环境用不同认证机制，会导致联调与测试矩阵膨胀。

## Risks / Trade-offs

- [风险] Supabase JWT secret 与后端配置不一致导致全量 401  
  → Mitigation：鉴权模式与密钥来源日志、文档中提供逐项核对清单。

- [风险] 前端缺少 Supabase 配置时仍显示可登录页面，造成误导  
  → Mitigation：登录页检测配置缺失并禁用提交，展示明确中文提示。

- [风险] 同时维护 session token 与 dev token 增加理解成本  
  → Mitigation：文档明确“默认 Supabase，dev_token 仅开发排障”。

- [权衡] 不引入后端登录 API 能降低复杂度，但也意味着认证故障依赖 Supabase 可用性  
  → Mitigation：保留开发态 dev_token 作为故障隔离手段，仅限非生产。
