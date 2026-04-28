## ADDED Requirements

### Requirement: Email signup and password signin in login entry
系统 SHALL 在 `/auth/login` 提供邮箱注册与密码登录两种可切换流程，并通过 Supabase Auth SDK 执行认证请求。

#### Scenario: User signs up with email and password
- **WHEN** 未登录用户在注册表单输入合法邮箱与密码并提交
- **THEN** 前端 MUST 调用 `supabase.auth.signUp`，并在成功后展示明确下一步提示（例如邮箱验证或自动登录结果）

#### Scenario: User signs in with email and password
- **WHEN** 已注册用户在登录表单输入正确邮箱与密码并提交
- **THEN** 前端 MUST 调用 `supabase.auth.signInWithPassword`，并在成功后进入已登录态

### Requirement: Authentication errors are visible and localized
认证流程中的可恢复错误 MUST 反馈给用户，且默认文案 MUST 使用 zh-CN i18n 键而非硬编码英文。

#### Scenario: Wrong password shows localized message
- **WHEN** Supabase 返回登录失败（如密码错误或账号不存在）
- **THEN** 页面 SHALL 显示可读的中文错误信息并允许用户继续重试

### Requirement: Route guards enforce authenticated and guest-only paths
前端路由 MUST 区分受保护页面与访客页面，未登录用户不得直接访问受保护业务页面，已登录用户不应停留在登录页。

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** 未登录用户访问 `/raw`、`/tasks`、`/notes`、`/review`、`/upload` 等受保护路径
- **THEN** 系统 SHALL 重定向到 `/auth/login`

#### Scenario: Authenticated user bypasses login page
- **WHEN** 已登录用户访问 `/auth/login`
- **THEN** 系统 SHALL 自动跳转至首页或既定默认业务页

### Requirement: Sign-out clears session for protected API access
用户主动退出登录后，客户端 MUST 清除当前会话，并使后续受保护 API 调用回到未授权状态。

#### Scenario: Signed-out user cannot continue protected actions
- **WHEN** 用户执行退出登录后尝试再次请求受保护 API
- **THEN** 请求 SHALL 因缺少有效 token 而进入未登录处理路径（如提示并跳转登录页）
