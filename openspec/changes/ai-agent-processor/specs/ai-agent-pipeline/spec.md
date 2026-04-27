## ADDED Requirements

### Requirement: Language detection before processing

系统 SHALL 在 Agent 处理开始前自动检测原始文档的语言。检测方式为统计正文（排除代码围栏行与标题行）中 CJK 字符占比，≥ 20% 判定为 `zh`，否则为 `en`。检测结果 MUST 传递给后续所有 LLM 调用组件，不得由各组件重复计算。

#### Scenario: Chinese document detected

- **WHEN** 原始文档正文 CJK 字符占比达到 20% 以上
- **THEN** `LanguageDetector` 返回 `source_lang = "zh"`，后续 LLM 调用使用阿里云百炼和中文 Prompt

#### Scenario: English document detected

- **WHEN** 原始文档正文 CJK 字符占比低于 20%
- **THEN** `LanguageDetector` 返回 `source_lang = "en"`，后续 LLM 调用使用 Gemini 和英文 Prompt

---

### Requirement: Markdown structure analysis without LLM

系统 SHALL 通过纯文本解析（正则表达式）提取 Markdown 文档的章节结构，包含标题层级、每个 section 的起止行号（1-based，inclusive）以及代码围栏范围，MUST NOT 为此步骤调用 LLM。

#### Scenario: Extract section boundaries

- **WHEN** Agent 收到原始 Markdown 内容
- **THEN** `StructureAnalyzer` 输出每个 section 的 `{heading, level, line_start, line_end}` 列表以及 `code_fence_ranges`

#### Scenario: Identify code fence positions

- **WHEN** 文档中存在以 ` ``` ` 标记的代码块
- **THEN** `StructureAnalyzer` 输出覆盖该代码块的 `{lang, line_start, line_end}` 记录

---

### Requirement: Atomic claim extraction per section

系统 SHALL 对每个 section 独立调用 LLM，提取 1 条或多条原子化 `core_claim`。每条 claim MUST 包含：完整可验证的主张陈述（topic + assertion，不得为标签式短语）、evidence（含 description 和 source_lines）、以及 anti_patterns（按原文实际内容，可为空数组）。

#### Scenario: Claim contains topic and assertion

- **WHEN** `ClaimExtractor` 对一个 section 调用 LLM
- **THEN** 返回的每条 claim 均包含可识别的主题词（topic）和关于该主题的完整陈述（assertion），不是单词标签

#### Scenario: Code in evidence preserved

- **WHEN** section 内容包含代码围栏
- **THEN** 对应 claim 的 `evidence.description` 中包含完整代码块，不被截断

#### Scenario: anti_patterns reflects source content

- **WHEN** section 中无明显对比或错误做法描述
- **THEN** 对应 claim 的 `anti_patterns` 为空数组，不凭空生成

#### Scenario: LLM JSON parse failure retried once

- **WHEN** LLM 返回内容不能被解析为合法 JSON
- **THEN** 系统对该 section 重试一次，重试后仍失败则跳过该 section 并记录 warning，不终止整个任务

---

### Requirement: Topic-cohesion note partitioning

系统 SHALL 将所有 section 的 claims 按主题内聚性聚合为 1..N 个 Note，MUST NOT 默认所有 claims 归入单一 Note。

#### Scenario: Single-topic file produces one note

- **WHEN** 文档所有 section 均围绕同一中心主题（定义、触发条件、用法、陷阱均属同一主题）
- **THEN** `NotePartitioner` 产出 1 个 Note

#### Scenario: Multi-topic file produces multiple notes

- **WHEN** 文档包含 3 个或以上主题各自独立的 section（各有独立标题且可单独回答 "what is X" 问题）
- **THEN** `NotePartitioner` 产出与主题数量对应的多个 Note，每个 Note 仅包含属于该主题的 claims

---

### Requirement: Strict 1:1 flashcard generation per claim

系统 SHALL 为每个 `core_claim` 生成恰好一张 Flashcard，MUST NOT 遗漏或重复。Flashcard 的 `question` MUST 仅使用 claim 的 topic，不包含 assertion 中的关键词；`answer` MUST 包含 claim 全文以及 evidence 内容（含代码块）。

#### Scenario: Claim count equals card count

- **WHEN** `CardGenerator` 处理一个 Note
- **THEN** 输出的 Flashcard 数量严格等于该 Note 的 `core_claims` 数量

#### Scenario: Question does not reveal answer

- **WHEN** 生成 Flashcard question
- **THEN** question 中不出现 assertion 的核心名词或动词，只使用 topic 名称和类别词（如"特性"、"条件"、"机制"）

#### Scenario: Answer includes evidence code block

- **WHEN** claim 的 `evidence.description` 包含代码围栏
- **THEN** 对应 Flashcard 的 `answer` 中包含完整代码块

#### Scenario: Card type determined mechanically

- **WHEN** claim 文本包含对比语言词（"而不是"/"不应该"/"应避免"/`instead of`/`avoid`/`never`）
- **THEN** `card_type = "error_correction"`

#### Scenario: Card type fill_in_blank for code claims

- **WHEN** claim 的 evidence 包含代码围栏且关键答案内容为具体语法或代码模式
- **THEN** `card_type = "fill_in_blank"`

---

### Requirement: Agent processing activated by environment variable

系统 SHALL 通过 `ENTROPY_AGENT` 环境变量控制处理路径：`=1` 时使用 AI Agent 路径，`=0` 或未设置时使用原确定性占位处理器。两条路径 MUST 通过相同的 Worker 调用点（`process_job()`）分发，接口签名兼容。

#### Scenario: Agent path activated

- **WHEN** `ENTROPY_AGENT=1` 且 `DASHSCOPE_API_KEY` 已配置
- **THEN** Worker 调用 `run_agent_processor`，执行完整 AI Agent 流水线

#### Scenario: Fallback to deterministic processor

- **WHEN** `ENTROPY_AGENT=0` 或未设置
- **THEN** Worker 调用原 `run_deterministic_processor`，行为与 Phase 1 完全一致

---

### Requirement: Processing task progress reporting

Agent 流水线 SHALL 在每个主要步骤完成后更新 `ProcessingTask.current_step` 和 `progress_percent`，使前端轮询可获得实时进度。

#### Scenario: Steps map to progress percentages

- **WHEN** Agent 依次完成各步骤
- **THEN** `current_step` 按顺序取值：`analyzing_structure`(10%)→`extracting_claims`(30-60%)→`partitioning_notes`(65%)→`generating_cards`(70-90%)→`persisting`(97%)→`completed`(100%)
