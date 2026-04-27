## 1. 基线规格与文档对齐

- [x] 1.1 对照 `工作台/项目文档/phase-1/phase-1-propose-01.md` 通读 `proposal.md`、`design.md` 与 `specs/phase-1-baseline/spec.md`，确认工具链表、排除项与 Proposal 02–04 依赖表述一致且无遗漏冲突。
- [x] 1.2 对照 `工作台/项目文档/phase-1/spec-design.md` 抽查本变更中的产品级 SHALL（摄入方式、语言、无 LLM 等），确认未被本变更弱化或误写。
- [x] 1.3 对照 `projects/entropy-zero/CLAUDE.md` 确认 Mock 登记、最小改动面等表述与仓库约定一致。

## 2. OpenSpec 项目上下文（可选）

- [x] 2.1 若团队希望降低后续 artifact 漂移：在 `openspec/config.yaml` 的 `context:` 下增加简短多行文本，汇总三份权威路径、应用根 `projects/entropy-zero/`、以及「冲突以 spec-design 为准」一句裁决规则；不粘贴全文密钥或环境值。
- [x] 2.2 若跳过 2.1：在 `design.md` 或团队 wiki 中记录「故意不写入 config.yaml」的原因，避免被误读为遗漏。（**不适用**：已执行 2.1。）

## 3. 后续变更开工检查

- [x] 3.1 创建或打开 `phase-1-backend-ingest-orchestration`、`phase-1-frontend-shell-ingest-ui`、`phase-1-notes-cards-review` 中任一变更时，在对应 `proposal.md` 或 `design.md` 前言粘贴三份权威引用（路径与 `phase-1-baseline` 规格中 Requirement 一致）。（已在 `design.md` 提供可复制的**下游变更前言模板**。）
- [x] 3.2 运行 `openspec status --change "phase-1-engineering-baseline"` 确认本变更 artifacts 均为完成态后，再开始 `/opsx:apply` 于下游功能变更（本变更的 apply 以完成上述检查项为主，通常无应用代码提交）。
