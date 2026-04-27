## Why

Phase 1 实施由多个 OpenSpec 变更驱动；若没有统一的权威上下文与工程基线，各变更容易在工具链、环境与产品约束上与主规格或仓库约定冲突。本变更把 **Proposal 01** 固化为可追溯的变更契约，使后续 `phase-1-backend-ingest-orchestration`、`phase-1-frontend-shell-ingest-ui`、`phase-1-notes-cards-review` 等变更在相同前提下开工。

## What Changes

- 在 OpenSpec 中建立 **Phase 1 工程基线** 能力规格：权威文档层级、工具链版本、环境与密钥策略、产品级约束摘要、Proposal 依赖顺序。
- 在 `design.md` 中约定各变更的 **proposal/design 前言** 必须引用的三份来源：`phase-1-propose-01.md`、`工作台/项目文档/phase-1/spec-design.md`、`projects/entropy-zero/CLAUDE.md`（冲突时以 `spec-design.md` 为准）。
- 明确 **本变更不交付应用功能代码**；交付物为规格与任务清单，供后续变更引用与验收对照。
- 可选（由 `tasks.md` 执行）：在 `openspec/config.yaml` 中补充与基线一致的 **project context** 片段，降低后续生成 artifacts 时的漂移。

## Capabilities

### New Capabilities

- `phase-1-baseline`: Phase 1 工程与产品基线（权威引用、工具链、环境、约束、Proposal 依赖、明确排除项）。

### Modified Capabilities

- （无：仓库尚无 `openspec/specs/` 既有能力，本变更仅新增 `phase-1-baseline`。）

## Impact

- **文档与 OpenSpec**：`openspec/changes/phase-1-engineering-baseline/` 下 artifacts；新增 `specs/phase-1-baseline/spec.md`。
- **代码库**：本变更规格阶段不修改 `projects/entropy-zero/` 运行时行为；若执行任务中的 `config.yaml` 更新，仅影响 OpenSpec 生成上下文。
- **后续变更**：所有 Phase 1 OpenSpec 变更应在 proposal 或 design 前言中引用本基线规格与上述三份权威文档。
