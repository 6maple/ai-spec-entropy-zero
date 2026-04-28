## ADDED Requirements

### Requirement: Authentication flow stays consistent across database targets
系统 SHALL 在“本地 PostgreSQL”与“Supabase 云 PostgreSQL”两种数据库连接模式下，保持同一套 Supabase Auth token 鉴权语义。

#### Scenario: Local DB with Supabase auth
- **WHEN** 后端 `DATABASE_URL` 指向本地 PostgreSQL 且前端已配置 Supabase 项目
- **THEN** 用户 SHALL 仍可通过 Supabase 登录并使用 access token 访问本地后端受保护接口

#### Scenario: Cloud DB with Supabase auth
- **WHEN** 后端 `DATABASE_URL` 切换为 Supabase PostgreSQL 连接串
- **THEN** 登录与受保护 API 访问行为 MUST 与本地数据库模式保持一致

### Requirement: Dev token mode is explicit and non-default
系统 MUST 将开发令牌模式定义为显式可选模式，且默认运行模式 SHALL 为 Supabase token 校验。

#### Scenario: Default mode uses Supabase JWT secret
- **WHEN** 未声明 dev token 模式
- **THEN** 后端 SHALL 按 Supabase JWT 配置执行验签，并拒绝不符合配置的令牌

#### Scenario: Dev token mode remains available for local debugging
- **WHEN** 显式启用 dev token 模式并提供 `DEV_JWT_SECRET`
- **THEN** 前端 `VITE_DEV_ACCESS_TOKEN` 仍 MAY 用于本地接口联调，不阻断开发排障链路

### Requirement: Environment examples document switch matrix
仓库中的环境样例文件与项目文档 SHALL 给出可执行的认证/数据库切换矩阵，确保开发者可复现三类模式（本地完整联调、云近生产、开发令牌调试）。

#### Scenario: Developer can bootstrap from examples
- **WHEN** 新开发者按 `.env.example` 与项目文档配置本地环境
- **THEN** 其可在不额外猜测隐含变量的前提下完成认证与 API 联调
