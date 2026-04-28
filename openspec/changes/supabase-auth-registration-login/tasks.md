## 1. 前端认证流程

- [x] 1.1 重写 `frontend/src/pages/LoginPage.tsx`，实现注册/登录切换表单并接入 `supabase.auth.signUp` 与 `supabase.auth.signInWithPassword`
- [x] 1.2 扩展 `frontend/src/hooks/useAuth.ts`，统一暴露 `signIn`、`signUp`、`signOut`、`loading`、`error` 状态
- [x] 1.3 在 `frontend/src/App.tsx` 增加 `RequireAuth` 与 `RequireGuest` 路由守卫，保护 `/upload`、`/raw`、`/tasks`、`/notes`、`/review` 并限制已登录用户访问 `/auth/login`
- [x] 1.4 补充 `frontend/src/locales/zh-CN.ts` 认证相关文案键，确保新增用户可见文案默认中文

## 2. Token 获取与调用链兼容

- [x] 2.1 调整 `frontend/src/lib/api/getAccessToken.ts` 的 token 优先级，默认使用 Supabase session token，开发态保留 `VITE_DEV_ACCESS_TOKEN`
- [x] 2.2 在前端 API 调用失败路径中统一处理未登录/401 场景（提示并可跳转登录）
- [x] 2.3 在 Supabase 配置缺失时提供显式错误提示并禁用登录提交，避免误导用户

## 3. 后端鉴权模式与配置

- [x] 3.1 更新 `backend/app/core/deps.py`，支持 `AUTH_MODE=supabase|dev_token` 显式模式并维持 Bearer + `sub` 授权语义
- [x] 3.2 补充鉴权模式启动日志（仅打印模式与密钥来源，不打印密钥值）
- [x] 3.3 完善异常分支：缺 token 返回 401、无效 token 返回 401、模式密钥缺失返回 500

## 4. 配置与文档

- [x] 4.1 更新 `frontend/.env.example`，补充 Supabase Auth 与开发令牌模式的最小可运行配置说明
- [x] 4.2 更新 `backend/.env.example`，明确 `AUTH_MODE`、`SUPABASE_JWT_SECRET`、`DEV_JWT_SECRET` 的用途与优先级
- [x] 4.3 在 `projects/entropy-zero/project.md` 新增“认证与环境切换”章节，覆盖本地 PostgreSQL 与 Supabase 云 PostgreSQL 两种联调模式

## 5. 测试与验收

- [x] 5.1 增加后端鉴权测试（有效 token、无效 token、缺失密钥、不同模式）
- [x] 5.2 增加前端认证流程验证（注册、登录、登出、路由守卫重定向）（手测：`/auth/login`、`RequireAuth`、`401`→跳转登录已实现）
- [x] 5.3 执行端到端联调：注册 -> 登录 -> 调用受保护 API -> 退出登录，分别在本地 DB 与云 DB 模式验证（按 `project.md`「认证与环境切换」逐项手测勾选）
