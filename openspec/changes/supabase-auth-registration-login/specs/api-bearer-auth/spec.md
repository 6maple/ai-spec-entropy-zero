## MODIFIED Requirements

### Requirement: Bearer token on protected routes

除公开认证端点外，访问 Raw、Task、Notes、Review 等受保护 API 的客户端 MUST 在请求头携带 `Authorization: Bearer <access_token>`。缺少或格式非法 MUST 返回 `401`。后端 MUST 支持显式鉴权模式：默认 `supabase` 模式使用 `SUPABASE_JWT_SECRET`（可允许兼容回退变量），`dev_token` 模式使用 `DEV_JWT_SECRET`，并在密钥缺失时返回服务端配置错误而非放行请求。

#### Scenario: Reject missing token

- **WHEN** 客户端调用受保护路由且未带 Bearer
- **THEN** 系统返回 `401` 且不执行业务写操作

#### Scenario: Fail fast when configured auth secret is missing

- **WHEN** 服务处于某鉴权模式但其对应密钥配置缺失
- **THEN** 系统 MUST 返回 `500` 配置错误并拒绝受保护请求
