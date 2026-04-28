## Why

当前系统仅具备会话读取与退出，缺少真实的用户注册与登录能力，导致认证链路在本地和云环境都无法完整验证。随着业务页面全面依赖 Bearer Token 访问受保护 API，需要将认证能力从“开发令牌临时方案”升级为“Supabase Auth 正式方案”。

## What Changes

- 新增前端基于 Supabase Auth 的邮箱注册、密码登录、退出登录能力，并统一中文错误提示。
- 新增认证路由守卫：未登录访问受保护页面自动跳转登录页；已登录访问登录页自动跳转首页。
- 调整前端 token 获取策略：保留 `VITE_DEV_ACCESS_TOKEN` 兼容路径，默认优先使用 Supabase session access token。
- 增强后端鉴权配置约定：明确 `supabase` 与 `dev_token` 两种模式及缺省行为，输出可观测启动日志。
- 补充环境配置与文档，使本地 PostgreSQL 和 Supabase 云 PostgreSQL 均可复用同一认证模型联调。

## Capabilities

### New Capabilities

- `supabase-auth-user-flow`: 覆盖注册、登录、登出、登录态路由保护与错误提示的前端认证闭环。
- `auth-environment-switching`: 覆盖本地与云环境下的认证与数据库连接模式切换约束与验收标准。

### Modified Capabilities

- `api-bearer-auth`: 明确后端 Bearer 校验在 `supabase`/`dev_token` 模式下的行为、配置优先级与错误语义。
- `knowledge-ingest-ui`: 将登录页从占位态提升为可操作认证页，并约束未登录访问业务入口的跳转行为。

## Impact

- 前端：`frontend/src/pages/LoginPage.tsx`、`frontend/src/hooks/useAuth.ts`、`frontend/src/App.tsx`、`frontend/src/lib/api/getAccessToken.ts`、`frontend/src/locales/zh-CN.ts`。
- 后端：`backend/app/core/deps.py`、认证相关测试与环境变量说明文件。
- 文档与配置：`frontend/.env.example`、`backend/.env.example`、`projects/entropy-zero/project.md`。
- 依赖与系统：继续使用 Supabase Auth，不新增自建账号系统；保持 FastAPI Bearer 鉴权模型不变。
