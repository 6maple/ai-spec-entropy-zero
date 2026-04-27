## Context

本变更对应 `工作台/项目文档/phase-1/phase-1-propose-01.md`（Engineering Baseline & Authoritative Context）。Phase 1 产品范围以 `工作台/项目文档/phase-1/spec-design.md` 为单一事实来源；应用实现根目录为 `projects/entropy-zero/`（含前端、后端与 `database/migrations/`）。工程执行约定以 `projects/entropy-zero/CLAUDE.md` 为准并与规格对齐。

## Goals / Non-Goals

**Goals:**

- 将 Proposal 01 中的基线内容 **结构化** 为可引用的 OpenSpec 能力规格 `phase-1-baseline`，供人机与后续变更一致遵循。
- 约定后续 Phase 1 OpenSpec 变更在 **proposal 或 design 前言** 中显式引用：`phase-1-propose-01.md`、`spec-design.md`、`CLAUDE.md`。
- 可选：在 `openspec/config.yaml` 写入与基线一致的简短 **project context**，减少后续 artifact 生成时的上下文缺失。

**Non-Goals:**

- 不实现 Proposal 02–04 中的后端编排、前端壳层或笔记/卡片功能。
- 不引入真实 LLM 供应商 HTTP 客户端、WebSocket/SSE 实时通道或英文默认语言包。
- 不进行与应用功能无关的大规模重构。

## Decisions

1. **能力命名**：采用 `phase-1-baseline` 作为规格目录名，与变更名 `phase-1-engineering-baseline` 区分，避免与「变更」概念混淆，同时保持检索一致。
2. **冲突裁决**：凡产品行为、范围与 `spec-design.md` 不一致的叙述，实施与评审均以 `spec-design.md` 为准；`CLAUDE.md` 负责工程约束与 Mock 登记；Proposal 01 文件负责跨提案依赖与「一页式」总览。
3. **config.yaml 更新**：仅在 `tasks.md` 中列为可执行任务；内容应压缩为可维护的要点列表，避免全文复制三份权威文档。
4. **后续变更映射**：与 Proposal 01 表格一致——`phase-1-propose-02.md` → `phase-1-backend-ingest-orchestration`；`phase-1-propose-03.md` → `phase-1-frontend-shell-ingest-ui`；`phase-1-propose-04.md` → `phase-1-notes-cards-review`。依赖关系：02 为 03 与 04 的上游；04 功能完整依赖 02 对 notes/flashcards 的持久化路径。

## Risks / Trade-offs

- **[Risk] 规格与仓库文档双写漂移** → **Mitigation**：基线规格只写 **可验证的 SHALL/MUST** 与引用路径；细节仍指向三份权威文件；`config.yaml` 只保留摘要。
- **[Risk] 本变更被误认为需大量编码** → **Mitigation**：`proposal.md` 与 `tasks.md` 明确交付边界为文档与可选配置，代码变更仅限任务明确列出的文件。

## Migration Plan

不适用（无生产数据迁移）。若更新 `openspec/config.yaml`，采用可回滚的单次编辑；回滚即恢复 YAML 历史版本。

## Open Questions

- 无。若团队希望将 `phase-1-propose-01.md` 移入 `openspec/` 树内，可在归档本变更后的 housekeeping 中单独讨论，不在本变更范围内。

## 下游 OpenSpec 变更前言模板（供 Proposal 02–04 复用）

创建 `phase-1-backend-ingest-orchestration`、`phase-1-frontend-shell-ingest-ui` 或 `phase-1-notes-cards-review` 时，将下列段落贴入对应 `proposal.md` 或 `design.md` 顶部（路径须与 `phase-1-baseline` 规格一致）：

```markdown
**权威引用（Phase 1）**  
- `工作台/项目文档/phase-1/phase-1-propose-01.md`  
- `工作台/项目文档/phase-1/spec-design.md`（与下文冲突时以此为准）  
- `projects/entropy-zero/CLAUDE.md`
```
