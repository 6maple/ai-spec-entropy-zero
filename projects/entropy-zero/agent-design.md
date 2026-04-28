# Entropy Zero — AI Agent 实现设计文档

**版本**：v1.0  
**日期**：2026-04-27  
**作者**：架构设计稿，供 Phase 2 实现参考

---

## 1. 背景与目标

### 1.1 当前状态

Phase 1 的 `processor.py` 是一个**确定性占位处理器**：

- 不调用任何 LLM
- 只做文件名提取标题 + 原文截断摘要
- 输出单个 Note + 单张 Flashcard，纯结构占位

### 1.2 目标

将 `ingest-json-auto` SKILL 的逻辑转化为**生产级 AI Agent 实现**，集成进 `projects/entropy-zero` 的后端处理流水线中，实现：

- Markdown → 原子化 `core_claims`（熵减分解）
- `core_claims` → 严格 1:1 复习卡（`Flashcard`）
- 结果持久化至 PostgreSQL，供前端展示和复习调度

---

## 2. 核心概念映射

| SKILL 概念         | Entropy Zero 数据库概念                           |
| ------------------ | ------------------------------------------------- |
| `note`             | `notes` 表（一个 RawKnowledge 可拆分为多个 Note） |
| `core_claim`       | `notes.content_json` 中的 `Point` 对象            |
| `card`             | `flashcards` 表（每个 `core_claim` 对应一行）     |
| `anti_patterns`    | `Point.anti_patterns` 字段（扩展现有 schema）     |
| `hooks`            | `Point.hooks` 字段（跨笔记链接，Phase 2.1 实现）  |
| 原始文件           | `raw_knowledge.content`                           |
| `slug` / `note_id` | `notes.note_id`（UUID）                           |

**关键差异**：SKILL 输出是文件系统 JSON，Entropy Zero 输出是数据库行。概念完全一致，持久化层不同。

---

## 3. Agent 架构设计

### 3.1 整体流程

```
RawKnowledge (content)
        │
        ▼
┌─────────────────────────────┐
│   AgentOrchestrator         │  ← 主控，分步推进，更新 ProcessingTask
├─────────────────────────────┤
│  Step 0: LanguageDetector   │  ← 检测源语言（zh / en），选择模型与 Prompt
│  Step 1: StructureAnalyzer  │  ← 分析章节结构，决定分成几个 Note
│  Step 2: ClaimExtractor     │  ← 每 section 提取 core_claims（原子化）
│  Step 3: NotePartitioner    │  ← 按主题内聚性合并 claims → Note 列表
│  Step 4: CardGenerator      │  ← 每个 claim → 一张 Flashcard
│  Step 5: HooksResolver      │  ← 扫描跨 Note 关联，写 hooks（可异步）
└─────────────────────────────┘
        │
        ▼
   DB Persistence             ← notes + flashcards 批量写入
```

**语言路由**：Step 0 检测出 `source_lang` 后，`LLMRouter` 全程持有该值。Step 2/4/5 中所有 LLM 调用均经由 `LLMRouter` 分发到对应模型和 Prompt 版本，无需各组件自行判断。

### 3.2 组件职责

#### `LanguageDetector`

- **输入**：原始 Markdown 文本
- **输出**：`source_lang: Literal["zh", "en"]`
- **LLM 调用**：**不需要**，统计 CJK 字符占比（正文 prose 行，排除代码围栏和标题行）
- **规则**：CJK 字符占正文字符数 ≥ 20% → `zh`；否则 → `en`
- **说明**：检测结果传入 `LLMRouter`，后续所有 LLM 调用和 Prompt 渲染均依赖此值

#### `StructureAnalyzer`

- **输入**：原始 Markdown 文本
- **输出**：`List[SectionMeta]`，包含标题、层级、行范围、是否含代码块
- **LLM 调用**：**不需要**，纯文本解析（正则提取 `##` 标题 + 代码围栏）
- **对应 SKILL**：Workflow Step 1（`parse_source.py` 的逻辑）

#### `ClaimExtractor`

- **输入**：单个 section 的文本内容 + section 元数据
- **输出**：`List[CoreClaim]`，每个包含 `claim`、`evidence`、`source_lines`
- **LLM 调用**：**每个 section 一次**，使用结构化输出（JSON mode）
- **关键约束**（来自 SKILL）：
  - claim 必须包含 topic + assertion + condition，不能是标签式短语
  - evidence 包含 description（含代码块时必须保留代码）
  - 不能逐字复制源文，必须改写为学习者视角
- **对应 SKILL**：entropy-reduction.md Step 4

#### `NotePartitioner`

- **输入**：所有 section 的 claims 列表 + 原文结构
- **输出**：`List[NoteBundle]`，每个 bundle 包含 title、abstract、tags、claims
- **LLM 调用**：**可选的一次轻量调用**（判断主题内聚性），或用规则决策：
  - 单一主题文件 → 1 Note
  - 各 section 命名不同主题 → N Notes
  - 3+ 无关主题混合 → N Notes，按主题聚类
- **对应 SKILL**：entropy-reduction.md Step 3（决策表）

#### `CardGenerator`

- **输入**：`NoteBundle`（含 `core_claims`）
- **输出**：`List[FlashcardPayload]`，严格 1:1 对应 claims
- **LLM 调用**：**每个 Note 一次**（批量处理该 Note 所有 claims），使用结构化输出
- **"1:1" 的精确含义**：输入 N 个 claims → 输出恰好 N 张 cards，顺序对应，不允许跳过或合并。CardGenerator 在返回前断言 `len(cards) == len(claims)`，不满足则对该 Note 重试一次，两次失败后对该 Note 返回错误（不影响其他 Note 的处理）。
- **关键约束**（来自 SKILL card-generation.md）：
  - `question` 只用 `topic`，不含 `assertion` 的关键词
  - `answer` = claim + evidence（代码必须包含）
  - `explanation` 补充机制/类比
  - card type 机械判定：有对比语言词 → `error_correction`；有代码围栏 → `fill_in_blank`；默认 → `qa`
- **对应 SKILL**：card-generation.md

#### `HooksResolver`

- **输入**：本次生成的所有 Notes + 数据库中已有 Notes 的索引
- **输出**：每个 Note 的 hooks 列表（引用其他 Note ID 和说明）
- **LLM 调用**：**一次**（跨 Note 语义匹配）或跳过（Phase 2.1）
- **对应 SKILL**：Workflow Step 7（Hooks Pass）

---

## 4. 数据模型扩展

### 4.1 `Point`（notes.content_json 中的元素）

现有 schema：
```python
class Point(BaseModel):
    p_id: str
    title: str
    body: str
```

扩展为 `CoreClaimPoint`：
```python
class Evidence(BaseModel):
    type: Literal["reasoning", "code_example", "analogy", "empirical"]
    description: str          # markdown 字符串，可含代码围栏
    source_lines: list[int]   # 行号列表

class CoreClaimPoint(BaseModel):
    p_id: str                          # 保持兼容
    title: str                         # 兼容旧 UI
    body: str                          # 兼容旧 UI（= claim 文本）
    # 以下为新增字段
    claim: str                         # 原子化知识主张
    evidence: Evidence
    anti_patterns: list[str]           # 常见误解/错误用法，markdown
    hooks: list[dict] = []             # 跨 Note 链接（Phase 2.1）
```

> **兼容策略**：`title` = claim 主题词，`body` = claim 全文。旧 UI 直接可用，新 UI 按 `claim`/`evidence` 渲染。

### 4.2 Agent 输出 Schema（新增至 `processor.py`）

当前 `ProcessorSuccess` 只包含单个 `NotePayload`，Agent 需要返回多个 Note，因此**在 `processor.py` 末尾追加**以下类型（不修改现有类型，确保 deterministic 路径零改动）：

```python
# backend/app/services/processor.py — 文件末尾追加

class NoteBundle(BaseModel):
    """一个 Note 及其所有 Cards，Agent 专用输出单元。"""
    title: str
    abstract: str
    tags: List[str] = Field(default_factory=list)
    points: List[dict]              # 与现有 worker 写入格式相同（p_id/title/body）
    card_payloads: List[CardPayload]  # 仅属于本 Note 的卡片


class AgentProcessorSuccess(BaseModel):
    note_bundles: List[NoteBundle]  # 1-N 个 Note
    processing_summary: ProcessingSummary


AgentProcessorResult = Union[AgentProcessorSuccess, ProcessorError]
```

**关键设计决策**：`card_payloads` 放在 `NoteBundle` 内部，每张卡与所属 Note 的绑定关系在输出结构中是显式的，worker 持久化时无需额外匹配逻辑。

### 4.3 `Flashcard` 扩展字段

现有 `flashcards` 表已有 `point_id`、`question`、`answer`。需新增（通过 migration）：

```sql
ALTER TABLE flashcards ADD COLUMN card_type VARCHAR(20) DEFAULT 'qa';
ALTER TABLE flashcards ADD COLUMN explanation TEXT;
ALTER TABLE flashcards ADD COLUMN claim_ref VARCHAR(100);  -- "note_id:claim_index"
```

### 4.3 `ProcessingTask.current_step` 枚举值

```
analyzing_structure   → 10%
extracting_claims     → 30%-60%（按 section 进度）
partitioning_notes    → 65%
generating_cards      → 70%-90%（按 Note 进度）
resolving_hooks       → 93%
persisting            → 97%
completed             → 100%
```

---

## 5. LLM 调用设计

### 5.1 语言路由策略

`LLMRouter` 持有 `source_lang`，按语言路由到不同的模型 + Prompt 版本：

| 语言         | 平台             | 模型                     | API Base                                                   | 免费额度     | 当前状态                     |
| ------------ | ---------------- | ------------------------ | ---------------------------------------------------------- | ------------ | ---------------------------- |
| `zh`（中文） | 阿里云百炼       | `deepseek-v4-flash`      | `https://dashscope.aliyuncs.com/compatible-mode/v1`        | ✅ 有免费额度 | **启用**                     |
| `en`（英文） | Google AI Studio | `gemini-3-flash-preview` | `https://generativelanguage.googleapis.com/v1beta/openai/` | ✅ 有免费额度 | 暂未启用（当前仅有中文知识） |

两个接口均兼容 OpenAI API 格式，`LLMRouter` 只需按语言切换 `api_base`、`api_key`、`model` 三个参数，其余调用逻辑完全共享。

```python
# backend/app/agent/llm_router.py

LANG_PROFILES = {
    "zh": LLMProfile(
        api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key_env="DASHSCOPE_API_KEY",
        model="deepseek-v4-flash",
        temperature=0.2,
    ),
    "en": LLMProfile(
        api_base="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key_env="GEMINI_API_KEY",
        model="gemini-3-flash-preview",
        temperature=0.2,
    ),
}

class LLMRouter:
    def __init__(self, source_lang: str):
        self.profile = LANG_PROFILES[source_lang]
        self.source_lang = source_lang

    async def call(self, prompt_name: str, variables: dict) -> dict:
        """渲染对应语言的 prompt，调用对应模型，返回解析后的 JSON。"""
        prompt = render_prompt(f"{prompt_name}_{self.source_lang}.jinja2", variables)
        return await _openai_compat_call(self.profile, prompt)
```

### 5.2 Prompt 模板概览

所有 prompt 存放在 `backend/app/agent/prompts/` 目录下，按 `{名称}_{语言}.jinja2` 命名。

#### `claim_extraction_zh.jinja2`（中文版 ClaimExtractor）

```
你是知识工程专家，擅长将 Markdown 技术文档分解为原子化知识主张。

## 原则
- 每个 claim 必须包含：主题（topic）+ 行为/属性（assertion）+ 适用条件（若有）
- 不能是标签式短语，必须是完整可验证的陈述
- 用学习者第一次接触该知识点的视角改写，不逐字抄录原文
- 代码示例必须完整保留在 evidence.description 中
- anti_patterns 数量不固定，按原文实际内容生成，没有则留空数组

## 输出 JSON Schema
{ "claims": [{ "claim": str, "evidence": { "type": str, "description": str, "source_lines": [int] }, "anti_patterns": [str] }] }

## 输入
Section 标题：{{ section_heading }}
Section 内容：
{{ section_content }}
```

#### `claim_extraction_en.jinja2`（英文版 ClaimExtractor）

```
You are a knowledge engineering expert specializing in decomposing Markdown technical
documents into atomic knowledge claims.

## Principles
- Each claim must contain: topic + assertion (behavior/property) + condition (if applicable)
- No label-style phrases — every claim must be a complete, verifiable statement
- Rewrite from the perspective of a learner encountering this concept for the first time
- Code examples must be preserved in full inside evidence.description
- anti_patterns count is variable — generate only what the source actually contains

## Output JSON Schema
{ "claims": [{ "claim": str, "evidence": { "type": str, "description": str, "source_lines": [int] }, "anti_patterns": [str] }] }

## Input
Section heading: {{ section_heading }}
Section content:
{{ section_content }}
```

#### `card_generation_zh.jinja2`（中文版 CardGenerator）

```
你是记忆卡设计专家，为以下知识主张生成复习卡。

## 规则
- question 只使用 topic（主题词），不能包含 assertion 中的关键词
- answer = claim 全文 + evidence 内容（含代码必须完整保留）
- explanation 补充机制或类比，不重复 answer 内容
- card_type 按规则机械判定：含对比语言词（而不是/不应该/应避免）→ error_correction；
  含代码围栏 → fill_in_blank；否则 → qa

## 输入 claims
{{ claims_json }}

## 输出 JSON Schema
{ "cards": [{ "claim_ref": str, "card_type": str, "question": str, "answer": str, "explanation": str }] }
```

#### `card_generation_en.jinja2`（英文版 CardGenerator）

```
You are a flashcard design expert. Generate review cards for the following knowledge claims.

## Rules
- question uses topic only — do NOT include key words from the assertion
- answer = full claim text + evidence content (preserve any code blocks verbatim)
- explanation adds mechanism or analogy — do NOT repeat the answer
- card_type is determined mechanically:
    contrast markers (instead of / should not / avoid / never) → error_correction
    fenced code block in evidence → fill_in_blank
    otherwise → qa

## Input claims
{{ claims_json }}

## Output JSON Schema
{ "cards": [{ "claim_ref": str, "card_type": str, "question": str, "answer": str, "explanation": str }] }
```

### 5.3 语言降级策略

当检测语言为 `zh` 但阿里云百炼 API 不可用时（Key 未配置 / 服务故障），`LLMRouter` 按以下顺序降级：

```
Bailian/Deepseek (zh prompt) → Gemini (en prompt) → ProcessorError("LLM_UNAVAILABLE")
```

降级到 Gemini 时自动切换为英文 Prompt（`*_en.jinja2`），因为 Gemini 英文 Prompt 质量优于中文。日志记录降级原因，供运维排查。反向（英文降级到 Bailian）同理。

### 5.4 调用次数估算

| 文档规模                  | Section 数 | LLM 调用次数        | 使用模型（zh/en） |
| ------------------------- | ---------- | ------------------- | ----------------- |
| 小（<500 行，1 主题）     | 3-5        | 4-6 次              | DeepSeek / Gemini |
| 中（500-2000 行，多主题） | 8-15       | 10-17 次            | DeepSeek / Gemini |
| 大（>2000 行）            | 20+        | 按 section 线性增长 | DeepSeek / Gemini |

---

## 6. Worker 集成

### 6.1 Orchestrator 入口（`backend/app/agent/orchestrator.py`）

Agent 处理器通过**进度回调**与 worker 解耦——Agent 不持有 DB session，worker 负责创建回调并更新 `ProcessingTask`：

```python
# backend/app/agent/orchestrator.py
from __future__ import annotations
from typing import Awaitable, Callable
from app.services.processor import (
    AgentProcessorResult, AgentProcessorSuccess,
    ProcessorInput, ProcessingSummary,
)

ProgressCallback = Callable[[str, int], Awaitable[None]]


async def run_agent_processor(
    inp: ProcessorInput,
    on_progress: ProgressCallback,
) -> AgentProcessorResult:
    return await AgentOrchestrator(inp, on_progress).run()


class AgentOrchestrator:
    def __init__(self, inp: ProcessorInput, on_progress: ProgressCallback):
        self.inp = inp
        self._progress = on_progress

    async def run(self) -> AgentProcessorResult:
        await self._progress("detecting_language", 5)
        source_lang = LanguageDetector.detect(self.inp.content)
        router = LLMRouter(source_lang)

        await self._progress("analyzing_structure", 10)
        sections = StructureAnalyzer.analyze(self.inp.content)

        all_claims = []
        for i, section in enumerate(sections):
            claims = await ClaimExtractor(router).extract(section)
            all_claims.append((section, claims))
            pct = 15 + int(45 * (i + 1) / len(sections))  # 15%→60%
            await self._progress("extracting_claims", pct)

        await self._progress("partitioning_notes", 65)
        bundles = NotePartitioner.partition(all_claims)

        result_bundles = []
        for i, bundle in enumerate(bundles):
            bundle_with_cards = await CardGenerator(router).generate(bundle)
            result_bundles.append(bundle_with_cards)
            pct = 70 + int(20 * (i + 1) / len(bundles))  # 70%→90%
            await self._progress("generating_cards", pct)

        await self._progress("persisting", 95)
        return AgentProcessorSuccess(
            note_bundles=result_bundles,
            processing_summary=ProcessingSummary(
                point_count=sum(len(b.points) for b in result_bundles),
                card_count=sum(len(b.card_payloads) for b in result_bundles),
                source_file=self.inp.file_name,
            ),
        )
```

### 6.2 Worker 修改（`backend/app/worker.py`）

共三处改动，其余代码**不变**。

#### 改动 1：顶部 import 块末尾追加

```python
import os
from app.agent.orchestrator import run_agent_processor
from app.services.processor import AgentProcessorSuccess

_AGENT_ENABLED = os.getenv("ENTROPY_AGENT", "0") == "1"
```

#### 改动 2：替换调用点

找到 `process_job()` 中的 `result = run_deterministic_processor(inp)` 这一行，替换为：

```python
if _AGENT_ENABLED:
    async def _on_progress(step: str, percent: int) -> None:
        async with maker() as _s:
            async with _s.begin():
                _t = await _s.get(ProcessingTask, job.task_id)
                if _t:
                    _t.current_step = step
                    _t.progress_percent = percent

    result = await run_agent_processor(inp, on_progress=_on_progress)
else:
    result = run_deterministic_processor(inp)
```

#### 改动 3：持久化路径分叉

将现有单 Note 持久化块替换为两条路径（删除旧的 `assert isinstance(result, ProcessorSuccess)` 行起到 `task2.flashcard_count = ...` 为止，替换为）：

```python
await session.execute(
    delete(Note).where(Note.raw_id == job.raw_id, Note.user_id == job.user_id)
)

if isinstance(result, AgentProcessorSuccess):
    # ── 多 Note 路径（Agent）──────────────────────────────
    first_note_id = None
    total_cards = 0
    for bundle in result.note_bundles:
        note_id = str(uuid.uuid4())
        if first_note_id is None:
            first_note_id = note_id
        note = Note(
            note_id=note_id,
            user_id=job.user_id,
            raw_id=job.raw_id,
            title=bundle.title,
            abstract=bundle.abstract,
            content_json="[]",
        )
        note.set_tags(bundle.tags)
        note.set_content_json(bundle.points)
        session.add(note)
        await session.flush()
        for card in bundle.card_payloads:
            session.add(Flashcard(
                card_id=str(uuid.uuid4()),
                user_id=job.user_id,
                note_id=note_id,
                point_id=card.point_id,
                question=card.question,
                answer=card.answer,
            ))
            total_cards += 1
    task2.note_id = first_note_id   # 存第一个 note_id，前端跳转后可查列表
    task2.flashcard_count = total_cards
else:
    # ── 单 Note 路径（deterministic，原逻辑不变）──────────
    assert isinstance(result, ProcessorSuccess)
    note_id = str(uuid.uuid4())
    note = Note(
        note_id=note_id,
        user_id=job.user_id,
        raw_id=job.raw_id,
        title=result.note_payload.title,
        abstract=result.note_payload.abstract,
        content_json="[]",
    )
    note.set_tags(result.note_payload.tags)
    points = [
        {"p_id": p.get("p_id", f"p_{i}"), "title": p.get("title", ""), "body": p.get("body", "")}
        for i, p in enumerate(result.note_payload.points)
    ]
    note.set_content_json(points)
    session.add(note)
    await session.flush()
    for card in result.card_payloads:
        session.add(Flashcard(
            card_id=str(uuid.uuid4()),
            user_id=job.user_id,
            note_id=note_id,
            point_id=card.point_id,
            question=card.question,
            answer=card.answer,
        ))
    task2.note_id = note_id
    task2.flashcard_count = len(result.card_payloads)

# 以下行保持不变
raw2.status = "processed"
raw2.error_summary = None
raw2.processed_at = datetime.now(timezone.utc)
task2.status = "completed"
task2.current_step = "done"
task2.progress_percent = 100
task2.error_msg = None
```

### 6.3 错误处理

| 错误类型                         | 处理策略                                 |
| -------------------------------- | ---------------------------------------- |
| LLM API 超时/限流                | 指数退避重试 3 次，超出则标记 `failed`   |
| JSON 解析失败                    | 记录原始 LLM 输出，重试该 section 一次   |
| claim 质量不达标（无 assertion） | 跳过该 claim，记录 warning，不终止任务   |
| 整个 section 提取失败            | 记录 error_summary，继续处理其他 section |
| card 数量 ≠ claim 数量           | 对该 Note 重试一次，两次失败跳过该 Note  |

---

## 7. 文件结构

```
backend/app/
├── agent/
│   ├── __init__.py
│   ├── orchestrator.py          # AgentOrchestrator 主控
│   ├── lang_detector.py         # 语言检测（CJK 字符占比，无 LLM）
│   ├── llm_router.py            # LLMRouter：按 source_lang 路由模型 + Prompt
│   ├── structure_analyzer.py    # 纯文本结构分析（无 LLM）
│   ├── claim_extractor.py       # LLM：section → claims
│   ├── note_partitioner.py      # 主题聚类决策
│   ├── card_generator.py        # LLM：claims → flashcards
│   ├── hooks_resolver.py        # LLM：跨 Note 链接（Phase 2.1）
│   ├── schemas.py               # Agent 内部数据结构（CoreClaim, NoteBundle 等）
│   └── prompts/
│       ├── claim_extraction_zh.jinja2   # 中文版
│       ├── claim_extraction_en.jinja2   # 英文版
│       ├── card_generation_zh.jinja2    # 中文版
│       └── card_generation_en.jinja2    # 英文版
├── services/
│   └── processor.py             # 保留（Phase 1 fallback，ENTROPY_AGENT=0 时使用）
└── worker.py                    # 调用入口，按 ENTROPY_AGENT env var 路由
```

> `processor.py` 保留作为 fallback，通过环境变量 `ENTROPY_AGENT=1` 激活 agent 路径。这样 Phase 1 测试不受影响。

---

## 8. 环境变量新增

```ini
# backend/.env 新增项（Phase 2）
ENTROPY_AGENT=1                        # 启用 AI Agent 路径（0=deterministic，1=agent）
AI_MAX_TOKENS=4096                     # 单次调用最大 token（两个模型共用）

# 中文模型：阿里云百炼（https://bailian.console.aliyun.com 注册，有免费额度）
# 模型：deepseek-v4-flash，API Base：https://dashscope.aliyuncs.com/compatible-mode/v1（已硬编码）
DASHSCOPE_API_KEY=sk-...              # 阿里云百炼 API Key（DashScope）

# 英文模型：Gemini（https://aistudio.google.com 获取 API Key，有免费额度）
# 模型：gemini-3-flash-preview，API Base 已硬编码
# 注意：当前仅处理中文知识，此 Key 暂不需要配置，供后续英文知识接入时使用
# GEMINI_API_KEY=AIza...
```

> **免费额度参考**：阿里云百炼 `deepseek-v4-flash` 新用户有百万级 token 试用额度；Gemini 3 Flash 通过 Google AI Studio 每天免费调用 1500 次（RPM 上限 15）。

### 8.1 `.env.local` 加载

`python-dotenv` 的 `load_dotenv()` 默认只加载 `.env`，不自动加载 `.env.local`。当前 `database.py` 和 `supabase.py` 均使用默认调用，所以放在 `.env.local` 中的 `DASHSCOPE_API_KEY` **不会被读取**。

**修改 `backend/app/db/database.py`**（在现有 `load_dotenv()` 行之后追加一行）：

```python
load_dotenv()                             # 加载 .env（基础配置）
load_dotenv(".env.local", override=True)  # 加载 .env.local（本地 secrets，覆盖 .env）
```

同样修改 `backend/app/db/supabase.py`（同一位置）。

`.env.local` 应已在 `.gitignore` 中忽略（确认 `backend/.gitignore` 或根目录 `.gitignore` 含 `*.local`）。

---

## 9. 数据库 Migration

```sql
-- database/migrations/002_agent_fields.sql

-- Flashcard 新增字段
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'qa';
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS claim_ref VARCHAR(100);

-- 为 claim_ref 加索引（用于 Hooks 查询）
CREATE INDEX IF NOT EXISTS idx_flashcards_claim_ref ON flashcards(claim_ref);
```

---

## 10. Quality Gates 对应实现

SKILL 定义了 5 个质量门，在 Agent 中的落地方式：

| Gate               | SKILL 要求                            | 实现位置                                                 |
| ------------------ | ------------------------------------- | -------------------------------------------------------- |
| Gate 1：可追溯性   | 每个 claim 有 evidence + source_lines | `ClaimExtractor` 输出验证                                |
| Gate 2：映射完整性 | 每个 claim 恰好一张卡                 | `CardGenerator` 枚举时计数断言                           |
| Gate 3：动态数组   | anti_patterns/hooks 不能硬编码数量    | Prompt 明确说明"按实际情况"，不给 N                      |
| Gate 4：结构约束   | 无父 Note 层，1 文件可产出 N Notes    | `NotePartitioner` 输出校验                               |
| Gate 5：冲突检测   | contradiction hook 需解决后才能通过   | `HooksResolver` 在 contradiction 时调用 conflict handler |

---

## 11. 实现优先级（Phase 2 内部排期）

| 优先级 | 组件                           | 说明                            |
| ------ | ------------------------------ | ------------------------------- |
| P0     | `LLMClient` + `ClaimExtractor` | 核心价值，没有它 Agent 无法运转 |
| P0     | `CardGenerator`                | 直接影响复习功能                |
| P1     | `StructureAnalyzer`            | 无 LLM，实现简单，影响提取质量  |
| P1     | `NotePartitioner`              | 规则决策为主，LLM 辅助          |
| P1     | DB Migration + Schema 扩展     | 并行进行                        |
| P2     | `HooksResolver`                | 跨 Note 链接，不影响核心流程    |
| P2     | 进度推送精细化                 | UX 改善                         |

---

## 12. 不在此次范围内

- 前端 UI 适配 `CoreClaimPoint` 新字段（Phase 2 UI 任务）
- FSRS 调度算法的 card_type 差异化处理
- Hooks 的前端渲染（"相关笔记"模块）
- 混合语言文档处理（同一文件中中英文混排，超出当前语言检测规则范围）
