# 笔记 / 复习 / FSRS-lite 发布与回滚（Phase 1）

## 发布前

1. 在目标环境跑 `database/migrations/001_init.sql`（或等价迁移），确认 `flashcards`、`review_logs` 与索引存在。  
2. 设置后端 `SUPABASE_JWT_SECRET` 或 `DEV_JWT_SECRET`，配置 `DATABASE_URL`；前端 `VITE_API_BASE_URL` 指向同一 API 前缀。  
3. 本地/CI：`cd frontend && pnpm build`；`cd backend && uv run python -c "from app.main import app"`。  
4. 可选 E2E：`cd frontend && pnpm exec playwright install` 后 `pnpm e2e`。

## 部署顺序

1. 部署/发布后端（含新路由与 `fsrs_lite`）。  
2. 部署前端（依赖新 API 响应形状时可短暂灰度或蓝绿，避免老前端解析失败）。  
3. 烟测：`GET /api/notes`、`GET /api/cards/due?scope=global`、`POST /api/cards/{id}/review` 各一次。

## 回滚

- **仅前端问题**：回滚前端静态资源；笔记/复习 API 仍兼容旧 `GET /api/notes` 列表。  
- **仅复习提交异常**：在配置开关允许时，可暂时在文档中声明「先使用全局复习」、隐藏笔记页「进入闭卷复习」入口（需代码开关时再改，不在此仓库默认关）。  
- **后端回滚**：若需撤销 FSRS 写入，在数据库层执行针对性修复（本变更未引入破坏性迁移，一般仅需回退部署版本）。  

## 移动端与异常请求

- 窄屏在笔记详情使用 `<details>` 收拢目录，侧栏不遮挡正文。  
- 复习 API 失败时，前端在 toast/文案中显示后端 `detail`（已本地化为中文时亦可能含技术消息时使用通用错误句）。
