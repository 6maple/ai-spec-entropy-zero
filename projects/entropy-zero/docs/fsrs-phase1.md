# Phase 1 FSRS-lite 说明

本项目的复习调度在 Phase 1 使用 **FSRS-lite**（`backend/app/services/fsrs_lite.py`），在完整 FSRS/Anki 实现之前提供可用的间隔、日志与 `fsrs_state` 字段持久化。

## 与完整 FSRS 的差异

- **间隔**不为 Anki/FSRS 参考实现 1:1 复现，不保证与第三方插件可对比。  
- **算法**仅使用 `stability`、`difficulty`、`reps` 的简化递推，用于产出一个新的 `next_review` 与可审计的 `review_logs` 行。  
- **Again** 类评分使用「约 10 分钟后」再排期，其他评分使用按天为单位的间隔，便于在 UI 中观察变化。  

## 生产预期

- 与「完整 FSRS」在数值上**不一致是预期**；若需可对比曲线，为后续阶段（可接入标准 FSRS 或迁移算法版本）。  
- 验收以「评分落库、日志存在、`next_review` 随评分变化」为主。

## 相关端点

- `GET /api/cards/due`：仅返回 `next_review` 不晚于当前时刻的卡片，支持 `scope=global|note` 与 `note_id` / `noteId`。  
- `POST /api/cards/{card_id}/review`：请求体为 `{ "rating": 1..4, "reviewed_at"?: "ISO8601" }`；返回 `log` 与 `card` 最新状态。  

## 引用

- OpenSpec 变更设计：`openspec/changes/notes-review-fsrs-lite/design.md`  
- 数据库：`database/migrations/001_init.sql`（`fsrs_state`、`review_logs`）
