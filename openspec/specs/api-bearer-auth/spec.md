# api-bearer-auth Specification

## Purpose

定义 Raw 与 Task 等资源 API 的最小鉴权边界，与 `spec-design.md` §6.6、§7 说明一致。

## Requirements

### Requirement: Bearer token on protected routes

除公开认证端点外，访问 Raw 与 Task 相关 API 的客户端 MUST 在请求头携带 `Authorization: Bearer <access_token>`。缺少或格式非法 MUST 返回 `401`。

#### Scenario: Reject missing token

- **WHEN** 客户端调用受保护路由且未带 Bearer
- **THEN** 系统返回 `401` 且不执行业务写操作

### Requirement: user_id from JWT sub only

系统 SHALL 从已验证 JWT 的 `sub` 声明解析 `user_id`，并将其注入服务层用于授权与数据过滤。系统 MUST NOT 将客户端请求体或查询串中的 `user_id` 作为授权依据。

#### Scenario: Ignore spoofed user_id in body

- **WHEN** 请求 JSON 中包含与 token 不一致的 `user_id` 字段
- **THEN** 系统仅以 token 的 `sub` 作为有效用户标识进行资源归属校验

### Requirement: Resource ownership checks

所有按 `raw_id` 或 `task_id` 的读与状态变更 MUST 校验资源属于当前 `user_id`，否则返回 `404`（或项目统一约定的等价响应），避免信息泄露。

#### Scenario: Cross-user raw access denied

- **WHEN** 用户 A 使用合法 token 请求用户 B 的 `raw_id`
- **THEN** 系统返回 `404` 且不返回该资源内容
