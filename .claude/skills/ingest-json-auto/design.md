# ingest-json SKILL 重设计方案（仅熵减与制卡）

## 1. 目标与用户画像

### 1.1 这个 SKILL 的用户是谁

- 主要用户：持续沉淀知识的开发者、学习者、研究型用户。
- 使用场景：把 docs/raw 下的原始知识文档，转为可复用的结构化笔记与复习卡。
- 成功标准：不是“生成一份摘要”，而是“生成可累积、可追溯、可复习”的知识资产。

### 1.2 这个 SKILL 用来做什么

- 在 ingest 阶段一次性完成知识编译：解构、结构化、关联、制卡。
- 后续 query 不再从 raw 反复重推导，而是从 notes 与 cards 直接检索与复习。

---

## 2. 当前问题复盘（针对现有 ingest-json）

- 问题 A：输出过度精简，原文高价值信息未进入 notes/cards。
- 问题 B：数组字段被“固定数量目标”驱动，而不是被知识密度驱动。
- 问题 C：制卡与知识原子没有严格绑定，导致复习覆盖不完整。

---

## 3. 设计原则（来自 Entropy Zero + LLM Wiki 思路）

- 原则 1：熵减是结构化重构，不是压缩删减。
- 原则 2：知识要在 ingest 时编译成持久资产，避免 query 时重复推导。
- 原则 3：原始来源不可变，所有结论必须可追溯到 source_lines。
- 原则 4：数组字段按知识自然生长，允许 0、1、N，不做拍脑袋定额。
- 原则 5：复习卡以 core_claims 为唯一主干，强制一一对应。

---

## 4. 复杂 SKILL 拆分方案（建议）

为降低主 SKILL 复杂度，采用“主流程 + 引用规范”的拆分：

- SKILL.md：只放触发条件、总流程、关键硬规则（短而强）。
- references/entropy-reduction.md：熵减算法与字段生成规则。
- references/card-generation.md：制卡规则与卡片类型决策。
- references/quality-gates.md：覆盖率/一致性/追溯性校验清单。
- references/conflict-policy.md：冲突检测与处理策略（仅引用，不扩写其他层）。

说明：该拆分方式对齐复杂技能的分层加载思想，主文件负责调度，细节在 references 按需加载。

---

## 5. 新流程总览（仅保留熵减与制卡）

1. Source Deconstruct（解构）
2. Entropy Reduction（生成 1..N notes）
3. Card Compilation（按 core_claims 一一制卡）
4. Quality Gates（未达标则回退重做）

---

## 6. 熵减步骤重设计（Entropy Reduction）

### 6.1 输入与输出

- 输入：单个 docs/raw/\*.md 文档。
- 输出：1..N 个 notes 对象。

### 6.2 1..N 笔记生成规则

- 先判定知识形态：
  - 单主题且强关联：生成 1 个 note。
  - 多主题或弱关联：按主题簇生成多个 note。
- 判定依据：章节主题变化、术语簇差异、因果链连续性、反模式归属一致性。

### 6.3 core_claims 作为最小原子

每个 note 的 content.core_claims 必须满足：

- 每条 claim 是可独立陈述的最小知识断言。
- 每条 claim 至少有一个 evidence。
- 每条 claim 必须绑定 source_lines。
- core_claims 数量由原子概念数量决定，不设置固定上限。

### 6.4 动态字段规则（替代固定数量）

- refinement.anti_patterns：
  - 仅从 source 中明确出现或可直接推导的错误做法提取。
  - 若无明确反模式，允许空数组。
- hooks：
  - 仅保留高置信关系（supplement/contradiction/causation/extension/analogy）。
  - 无高置信关系时允许空数组，并写明 no_hook_reason。

### 6.5 熵减覆盖率约束

- 每个高信息章节至少映射到一个 core_claim。
- 若某章节未映射，必须在 note 中记录 omission_reason，随后重试一次解构。

---

## 7. 制卡步骤重设计（Card Compilation）

### 7.1 一一对应硬规则

- 每个 core_claim 必须且只能生成 1 张主卡（primary card）。
- 禁止“多条 claim 共用一张主卡”。
- 禁止“主卡无对应 claim”。

映射关系：

- note.content.core_claims[i] <-> cards[i].primary_claim_ref

### 7.2 卡片类型策略（不再固定总数）

- 每条 primary card 默认 type=qa。
- 若 claim 含精确术语、公式、代码片段，可将该主卡切换为 fill_in_blank。
- 若 claim 对应 anti_pattern，可将该主卡切换为 error_correction。
- 为保持流程简洁，禁止附加卡（optional cards）。
- 结论：每个 core_claim 仅生成 1 张卡，不额外扩展同 claim 的多难度卡。

### 7.3 卡片字段要求

每张 primary card 必须包含：

- card_id
- claim_ref（指向 note_id + claim_index）
- type
- question
- answer
- explanation
- source_lines

### 7.4 复习覆盖率指标

- claim_card_coverage = primary_cards / core_claims
- 硬门槛：claim_card_coverage 必须等于 1.0

---

## 8. 质量闸门（执行后校验）

### 8.1 熵减闸门

- 所有 core_claims 均有 evidence 与 source_lines。
- anti_patterns 与 hooks 不做数量要求，只做真实性与可追溯性要求。
- 允许空数组，但必须在 content.hooks_meta.no_hook_reason 写明原因。

### 8.2 制卡闸门

- 每条 core_claim 都有且仅有一张主卡。
- 每张主卡可追溯到 claim_ref 与 source_lines。
- 若未达到 1:1，任务失败并回退到制卡阶段重做。

---

## 9. SKILL.md 建议改写骨架（可直接用于 Claude Skill）

```markdown
---
name: ingest-json
description: Ingest raw markdown knowledge into entropy-reduced notes and claim-aligned review cards. Use this whenever user asks to ingest/process/convert docs/raw content into notes/cards, especially when coverage, traceability, and spaced-repetition quality are required.
---

# Ingest JSON

## Scope

Only handle:

- Entropy reduction (raw -> 1..N notes)
- Card compilation (core_claims -> 1:1 primary cards)

## Workflow

1. Deconstruct source into atomic concepts and section map.
2. Generate 1..N notes based on topic cohesion.
3. Build core_claims as atomic assertions with evidence and source lines.
4. Generate one primary review card per core_claim.
5. Run quality gates; if failed, repair and rerun affected stage.

## Hard Rules

- Do not set fixed counts for anti_patterns/hooks/cards.
- core_claims are the minimal atomic unit.
- Every core_claim must map to exactly one primary card.
- No direct external model API calls; use native Claude tools only.

## References

- [Entropy Reduction Rules](./references/entropy-reduction.md)
- [Card Generation Rules](./references/card-generation.md)
- [Quality Gates](./references/quality-gates.md)
```

---

## 10. 决策冻结（已确认）

- D1：以简洁为主，严格 1:1。每个 core_claim 对应且仅对应 1 张复习卡。
- D2：以简洁为主，不需要 parent note。raw 文档可生成 1..N 个 notes，但不再增加总览父笔记层。
- D3：no_hook_reason 固定放在 content.hooks_meta。

这些决策视为实现期硬约束，不再回退为可选项。

---

## 11. 预期产物变化

- notes 不再“为了凑数量而写数组”，而是反映真实知识结构。
- cards 与 core_claims 建立确定性映射，复习覆盖可量化。
- 复杂逻辑拆分为 references，SKILL 主体更稳定、更易维护、更符合 Claude skill 的渐进加载模式。

---

## 12. 新会话接手实施蓝图（可直接执行）

### 12.1 实施范围

- 只改 ingest-json 技能中“熵减步骤”和“制卡步骤”。
- 不改 UI、不改其他业务流程、不扩展额外层级。

### 12.2 目录与文件目标

- 主入口：gen-skills/ingest-json/SKILL.md
- 参考拆分：
  - gen-skills/ingest-json/references/entropy-reduction.md
  - gen-skills/ingest-json/references/card-generation.md
  - gen-skills/ingest-json/references/quality-gates.md

说明：若现有技能目录非以上路径，保留原路径，仅按同构方式拆分。

### 12.3 实现步骤（按顺序）

1. 重写 SKILL.md frontmatter 与触发描述

- description 中写明触发词：ingest/process/convert/raw markdown/notes/cards/entropy reduction/flashcards。
- 保持“可自动触发 + 可 slash 调用”默认行为。

2. 重写熵减流程

- Stage A：解构 source，生成 section map 与 atomic concepts。
- Stage B：按主题关联度将 source 切分为 1..N note 单元。
- Stage C：每个 note 生成 core_claims（最小原子断言）。
- Stage D：动态生成 anti_patterns 与 hooks；hooks 可为空，但必须填 content.hooks_meta.no_hook_reason。

3. 重写制卡流程

- 以 core_claims 为唯一输入，逐条生成 primary card。
- 强制 1:1：card_count == core_claim_count。
- 禁止附加卡。

4. 增加质量闸门

- Gate-1（追溯）：每条 claim 与 card 都有 source_lines。
- Gate-2（一致）：每张卡都有 claim_ref，且 claim_ref 唯一。
- Gate-3（覆盖）：claim_card_coverage == 1.0。
- 任一 gate 失败时，仅回退失败阶段重做。

5. 最小回归验证

- 选 docs/raw/development.md 做一次 ingest 演练。
- 检查是否覆盖后半主题段，不再只覆盖前两段。

### 12.4 数据结构硬约束

- note.content.core_claims: array，长度 >= 1。
- note.content.refinement.anti_patterns: array，可空。
- note.content.hooks: array，可空。
- note.content.hooks_meta.no_hook_reason: string，当 hooks 为空时必填。
- note-cards.cards: array，长度必须等于对应 note 的 core_claims 长度。
- card.claim_ref: 必填，格式建议 note_id:claim_index。

### 12.5 验收标准（完成定义）

- A1：不存在固定数量要求（如“必须 3-5 张卡”“hooks 目标 2-3 条”）。
- A2：每个 core_claim 都有且仅有一张卡。
- A3：多 note 场景下无 parent note 字段与产物。
- A4：hooks 为空时，content.hooks_meta.no_hook_reason 存在且非空。
- A5：用 development.md 实测时，notes/cards 对原文主题覆盖明显高于现状。

### 12.6 交付物清单

- 更新后的 SKILL.md。
- 3 个 references 子文档（entropy-reduction/card-generation/quality-gates）。
- 一份简短验证记录（可追加在 design.md 末尾），记录 development.md 的覆盖检查结果。

### 12.7 给下一位模型的执行提示

- 先读本文件，再改技能文件；不要先写代码后补规则。
- 先落地硬约束（1:1、无 parent、hooks_meta），再优化文案。
- 若与旧 schema 冲突，优先满足本文件第 10 节“决策冻结”。
