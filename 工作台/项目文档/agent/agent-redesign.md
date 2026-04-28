# Agent 重设计 · 类型驱动版（Claim-Type-Driven Agent）

> 状态：待评审 → OpenSpec change 草案
> 版本：v1.1（自包含版，替代 propose-3）
> 日期：2026-04-28

---

## 0. 文档地位

本方案是 Entropy Zero AI Agent 的**最终重构方案**，**完全替代** `propose-3.md`。
本文档为单一信息源（self-contained），删除 propose-3 后仍可凭此文档独立完成 Agent 的重构与实施。

历史脉络（仅供背景，不影响实施）：

- **propose-1/2**：早期多步 LLM 方案，已废弃
- **propose-3**：将 13 次 LLM 调用收敛为 1 次，但仍存在三个未解问题——
  1. Note 分组依据是"主题内聚性"（开放、不稳定，跨文档无法聚合）
  2. 缺少文档级元数据（tags 散落在各 Note）
  3. Claim 与 Question 串行生成，question 易泄露关键词
- **本方案**：以 `KnowledgeClaimType` 作为 Note 分组主轴，引入文档级 `MetaTag`，并强制 `Claim` 与 `CardQuestion` **协同生成**。

---

## 1. 设计目标

| 目标             | 实现                                                       |
| ---------------- | ---------------------------------------------------------- |
| 分组稳定可聚合   | 用半开放枚举 `KnowledgeClaimType` 作为 Note 的唯一主轴     |
| 文档级语义索引   | 引入 `MetaTag = { domain, topics[] }` 作为文档级元数据     |
| 复习卡可考查     | Claim 与 CardQuestion 协同生成，强制 question 不泄露关键词 |
| 跨文档可视化     | 前端可按 `claim_type` / `domain` / `topics` 筛选与聚合     |
| 性能预算可控     | **单次** LLM 调用完成全部三步                              |
| 不依赖文档格式   | LLM 按语义分组，不依赖 `##` 标题等 Markdown 结构           |

---

## 2. 核心概念形式化

```
{Input}                   原始 Markdown 全文
{MetaTag}                 文档级元数据 = { domain, topics[] }
{KnowledgeClaimType}      半开放枚举：8 核心类型 + 'custom:xxx' 扩展
{KnowledgeClaim}          原子知识点（已被微调为对应 CardQuestion 的精确答案）
{KnowledgeCardQuestion}   与 Claim 协同生成的复习提问
{Note}                    "同一 KnowledgeClaimType 下所有 Claim 的容器"
```

层级关系：

```
RawKnowledge ({Input})
├── MetaTag                              （1 个，文档级）
│   ├── domain  : "前端开发"             （粗粒度）
│   └── topics  : ["BFC", "浮动布局"]    （细粒度，3-8 项）
│
└── Note[1..N]                           （N = 文档中实际出现的 claim_type 数量）
    ├── claim_type : KnowledgeClaimType
    ├── title / abstract
    └── KnowledgeClaim[1..M]
        ├── claim                        （已"答案化"的陈述）
        ├── evidence
        ├── anti_patterns[]
        └── KnowledgeCardQuestion (1)
            ├── question                 （与 claim 协同生成）
            └── explanation?
```

**关键约束**：

- **严格 1 类型 = 1 Note**：哪怕该类型只产出 1 个 claim，也独立成 Note；不做合并、不引入 misc 桶
- **不出现的类型不要建空 Note**：N 是文档中实际出现的类型数，不是枚举的 8
- **同一 claim 只能归入一个最贴切的类型**：按主导意图归类

---

## 3. 处理流程总览

```
Markdown 全文
    ↓
本地语言检测（< 1ms，CJK 字符占比统计）
    ↓
渲染大 Prompt（注入：原文 + claim_type 枚举与定义）
    ↓
单次 LLM 调用 → 返回 JSON：
    {
      meta_tag: { domain, topics[] },
      notes: [
        {
          claim_type: "<enum or custom:xxx>",
          title, abstract,
          claims: [
            { p_id, title, claim, evidence, anti_patterns, card_question }
          ]
        }
      ]
    }
    ↓
本地后处理：
  ① meta_tag 校验（domain 非空、topics 去重 & 长度截断）
  ② claim_type 校验（属于核心 8 类 或 以 custom: 开头）
  ③ 按 claim_type 派生 card_type（机械映射）
  ④ answer = claim + "\n\n" + evidence （本地拼接）
  ⑤ p_id 修复 / abstract 截断 / 空字段兜底
    ↓
返回 AgentProcessorSuccess(meta_tag, note_bundles[])
    ↓
Worker 持久化：raw_knowledge.meta_tag_json + notes(claim_type) + flashcards
```

**调用次数**：1 次 LLM 调用，典型耗时 10-20 秒（旧方案 30-90 秒）。

---

## 4. KnowledgeClaimType 规范（半开放枚举）

### 4.1 核心 8 类（封闭部分）

| claim_type             | 中文名      | 适用范式               | 复习卡考查重点 |
| ---------------------- | ----------- | ---------------------- | -------------- |
| `concept_definition`   | 概念定义    | "X 是什么"             | 定义复述       |
| `mechanism_principle`  | 机制原理    | "X 为什么/如何工作"    | 因果链         |
| `procedure_workflow`   | 操作流程    | "怎么做 X"             | 步骤还原       |
| `config_parameter`     | 配置参数    | "X 有哪些选项/取值"    | 参数辨识       |
| `comparison_contrast`  | 对比辨析    | "X 与 Y 的区别/取舍"   | 差异点         |
| `pitfall_anti_pattern` | 陷阱/反模式 | 原文明确的错误做法     | 反例识别       |
| `best_practice`        | 最佳实践    | 推荐做法               | 选择依据       |
| `performance_tradeoff` | 性能/权衡   | 代价、复杂度、边界条件 | 权衡判断       |

### 4.2 半开放扩展

LLM 在 8 类无法准确归类时，**允许**用 `custom:<snake_case>` 前缀新建一个类型：

```
custom:protocol_handshake          (协议握手特定子类型)
custom:security_threat_model       (威胁建模专属)
custom:dom_lifecycle               (DOM 生命周期相关)
```

**约束**：

- 自定义类型必须以 `custom:` 开头（便于识别与审计）
- 名称使用 snake_case，禁止使用与核心 8 类语义重叠的命名
- Worker 在持久化时记录每次出现的 custom 类型，定期由人工审视是否提升为核心类型

### 4.3 同 claim 多类型如何归类

> 一个 claim 只能归入**一个最贴切的类型**。Prompt 中明确指令"按主导意图归类"：
>
> - "X 不应该用 Y 实现，因为会触发 Z 问题" → `pitfall_anti_pattern`（主导意图是反例），而非 `mechanism_principle`
> - "X 默认使用 LRU 缓存" → `config_parameter`（描述配置默认值），而非 `concept_definition`

---

## 5. MetaTag 规范

### 5.1 数据结构

```python
class MetaTag(BaseModel):
    domain: str               # 粗粒度领域（单值，2-12 字）
    topics: list[str]         # 细粒度主题（3-8 项，每项 2-12 字的名词短语）
```

### 5.2 双重定位

#### 5.2.1 后续处理路由依据

- **topics 作为 Hooks 检索的输入信号**：Phase 2.1 的 `HooksResolver` 用 topics 做候选集预筛选，再对候选 Note 做语义比对，比"全库扫描"高效

#### 5.2.2 前端筛选/聚合维度

- 主页支持按 `domain` 树状导航（例如 `前端开发 → JavaScript → 异步编程`）
- 复习页支持按 `topics` 多选过滤（"今天只复习 BFC 相关的卡片"）
- 列表视图按 `claim_type` 分组展示（"我的所有反模式知识"）

> 这两个用法决定了：MetaTag 必须存入数据库（不能只放在响应里），且需要建索引。见 §13。

---

## 6. 本地语言检测

取文档前 500 字符中的前 100 个**有效字符**（过滤 Markdown 标记、数字、URL、空白），统计 CJK 字符占比：

- CJK 占比 ≥ 25% → `zh`
- CJK 占比 < 25% → `en`
- 有效字符 < 20 → 默认 `zh`

### 6.1 完整实现 `app/agent/local_lang.py`

```python
"""本地字符统计语言检测，无 LLM 调用，< 1ms。"""
from __future__ import annotations

import re

_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
_STRIP_RE = re.compile(r"[#*`\->\[\]()\d\s]|https?://\S+")


def detect_language_local(text: str) -> str:
    """返回 'zh' 或 'en'。"""
    cleaned = _STRIP_RE.sub("", text[:500])[:100]
    if len(cleaned) < 20:
        return "zh"
    cjk_count = len(_CJK_RE.findall(cleaned))
    return "zh" if cjk_count / len(cleaned) >= 0.25 else "en"
```

### 6.2 单元测试要点

| 用例                              | 期望     |
| --------------------------------- | -------- |
| 纯中文 200 字                     | `"zh"`   |
| 纯英文 200 字                     | `"en"`   |
| 中英混合，CJK 50%                 | `"zh"`   |
| 中英混合，CJK 10%                 | `"en"`   |
| 全是 Markdown 标记 + 数字（无文字） | `"zh"`（默认） |
| 空字符串                          | `"zh"`（默认） |

---

## 7. LLMRouter

### 7.1 设计要点

- 按 `source_lang` 路由模型 + Prompt 版本
- 主调用失败时降级到另一语言的模型 + Prompt（zh ↔ en）
- 内置指数退避重试 3 次
- JSON 解析失败也算失败，触发降级

### 7.2 完整实现 `app/agent/llm_router.py`

```python
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import Template
from openai import APIError, OpenAI, RateLimitError

from app.core import config

log = logging.getLogger("entropy.agent.llm_router")
_PROMPTS_DIR = Path(__file__).parent / "prompts"


@dataclass
class LLMProfile:
    api_base: str
    api_key_env: str
    model: str
    temperature: float = 0.1


LANG_PROFILES: dict[str, LLMProfile] = {
    "zh": LLMProfile(
        api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key_env="DASHSCOPE_API_KEY",
        model="qwen-plus",
    ),
    "en": LLMProfile(
        api_base="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key_env="GEMINI_API_KEY",
        model="gemini-3-flash-preview",
    ),
}


class LLMRouter:
    """按 source_lang 路由 LLM；提供单一调用入口 .call(prompt_name, variables)。"""

    def __init__(self, source_lang: str):
        if source_lang not in LANG_PROFILES:
            raise ValueError(f"Unsupported source_lang: {source_lang}")
        self.source_lang = source_lang
        self.primary_profile = LANG_PROFILES[source_lang]
        self.fallback_lang = "en" if source_lang == "zh" else "zh"
        self.fallback_profile = LANG_PROFILES[self.fallback_lang]

        self.primary_client = OpenAI(
            base_url=self.primary_profile.api_base,
            api_key=self._resolve_api_key(self.primary_profile.api_key_env, required=True),
        )
        fallback_key = self._resolve_api_key(self.fallback_profile.api_key_env, required=False)
        self.fallback_client = (
            OpenAI(base_url=self.fallback_profile.api_base, api_key=fallback_key)
            if fallback_key else None
        )

    def _resolve_api_key(self, key_name: str, required: bool) -> str | None:
        key = (
            config.get_dashscope_api_key()
            if key_name == "DASHSCOPE_API_KEY"
            else config.get_gemini_api_key()
        )
        if required and not key:
            raise RuntimeError(f"Missing required API key: {key_name}")
        return key or None

    def call(self, prompt_name: str, variables: dict[str, Any]) -> dict[str, Any]:
        """渲染对应语言的 prompt，调用对应模型，返回解析后的 JSON dict。"""
        try:
            rendered = self._render_prompt(prompt_name, self.source_lang, variables)
            text = self._call_with_retries(self.primary_client, self.primary_profile, rendered)
            return self._parse_json(text)
        except (APIError, RuntimeError, json.JSONDecodeError) as primary_error:
            if self.fallback_client is None:
                raise RuntimeError("LLM_UNAVAILABLE") from primary_error
            log.warning("Primary LLM failed, fallback triggered: %s", primary_error)
            rendered = self._render_prompt(prompt_name, self.fallback_lang, variables)
            text = self._call_with_retries(self.fallback_client, self.fallback_profile, rendered)
            return self._parse_json(text)

    def _render_prompt(self, prompt_name: str, lang: str, variables: dict[str, Any]) -> str:
        prompt_path = _PROMPTS_DIR / f"{prompt_name}_{lang}.jinja2"
        template = Template(prompt_path.read_text(encoding="utf-8"))
        return template.render(**variables)

    def _call_with_retries(self, client: OpenAI, profile: LLMProfile, prompt: str) -> str:
        last_err: Exception | None = None
        for attempt in range(3):
            try:
                response = client.chat.completions.create(
                    model=profile.model,
                    temperature=profile.temperature,
                    max_tokens=config.get_ai_max_tokens(),
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content
            except RateLimitError as e:
                last_err = e
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        raise RuntimeError("LLM_UNAVAILABLE") from last_err

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        """容忍 ```json ``` 包装的 JSON 输出。"""
        s = (text or "").strip()
        if s.startswith("```"):
            # 剥离首尾代码围栏
            s = re.sub(r"^```(?:json)?\s*", "", s)
            s = re.sub(r"\s*```$", "", s)
        return json.loads(s)
```

> 别忘了在文件顶部 `import re`。

---

## 8. 大 Prompt 设计

所有 prompt 存放在 `backend/app/agent/prompts/`，按 `{名称}_{语言}.jinja2` 命名。
本方案只需 **一对** prompt：`extract_zh.jinja2` + `extract_en.jinja2`。

### 8.1 中文版 `extract_zh.jinja2`

```jinja2
你是专业的知识提炼专家。请从以下原始内容中提炼结构化笔记与复习卡片。

## 重要前提
原始内容可能格式混乱、没有标题、多主题混杂，这是正常的。
你将完成三步，统一输出为一个 JSON。**不要分多次输出，不要包裹 ```json ``` 代码块。**

---

## 第一步：识别文档级元数据（MetaTag）

通读全文，输出：
- domain：该文档所属的粗粒度领域（单值，2-12 字），例：「前端开发」「数据库」「网络协议」
- topics：该文档涉及的细粒度主题数组，3-8 项，每项 2-12 字的名词短语
  例：["BFC", "浮动布局", "包含块"]

---

## 第二步：按 KnowledgeClaimType 分组

从下列**核心 8 类**中选取本文档实际出现的类型，每出现一种就开一个 Note：

| claim_type             | 含义                          |
| ---------------------- | ----------------------------- |
| `concept_definition`   | 概念定义（"X 是什么"）        |
| `mechanism_principle`  | 机制原理（"X 为何/如何工作"） |
| `procedure_workflow`   | 操作流程（"怎么做 X"）        |
| `config_parameter`     | 配置参数（"X 有哪些取值"）    |
| `comparison_contrast`  | 对比辨析（"X 与 Y 的区别"）   |
| `pitfall_anti_pattern` | 陷阱/反模式（原文明确反例）   |
| `best_practice`        | 最佳实践（推荐做法）          |
| `performance_tradeoff` | 性能/权衡（代价、复杂度）     |

**核心 8 类无法准确归类时**，可使用 `custom:<snake_case>` 前缀新建类型（如 `custom:protocol_handshake`），但仅在确有必要时使用，不要滥用。

**严格规则**：
- 一种类型 → **恰好 1 个 Note**（不要把同类型拆成多个 Note）
- 文档中没有出现的类型 → **不要建空 Note**
- 一个 claim **只归入一个最贴切的类型**（按主导意图判断）
- Note.title 由你命名，需含该 claim_type 的语义（如「BFC 的触发机制」「常见浮动布局陷阱」）
- Note.abstract ≤ 280 字，概括本 Note 的核心内容

---

## 第三步：协同生成 claim 与 card_question

对每个 claim，**同时**考虑：

1. **card_question**：仅基于 claim 的 topic（主题词）提问
   - ❌ 禁止泄露 claim 的关键词或结论
   - 必须能引导读者回忆出 claim 的完整内容
   - 示例对比：
     - ✅ "BFC 触发后对包含浮动元素有什么效果？"
     - ❌ "`overflow: hidden` 如何通过触发 BFC 包含浮动？"（暴露关键词）

2. **claim**：必须微调为"恰好能完整回答 card_question 的陈述"
   - 不能是标题或模糊描述
   - 必须是完整、可验证的陈述
   - 示例对比：
     - ✅ "`overflow: hidden` 可以触发 BFC，使容器能完整包含其内部浮动子元素的高度"
     - ❌ "BFC 的触发条件"（这是标题，不是断言）

**两者作为一对协同产出，禁止先固定其中一个再补另一个。**

其它字段：
- **evidence**：从原文直接提取的支撑材料；代码块必须保留完整 ``` 围栏（含语言标识）
- **anti_patterns**：**仅当原文明确描述了错误做法时才填写**，否则为空数组 `[]`。**禁止虚构反例**
- **explanation**：可选补充解释，与 claim+evidence 不重复；无补充则 `null`

---

## 输出格式

只输出一个合法 JSON 对象，结构如下（不输出 Markdown 包装）：

```
{
  "meta_tag": { "domain": "...", "topics": ["...", "..."] },
  "notes": [
    {
      "claim_type": "concept_definition",
      "title": "...",
      "abstract": "...",
      "claims": [
        {
          "p_id": "n1-p1",
          "title": "...",
          "claim": "...",
          "evidence": "...",
          "anti_patterns": [],
          "card_question": {
            "question": "...",
            "explanation": null
          }
        }
      ]
    }
  ]
}
```

p_id 格式：`n{note序号}-p{point序号}`，从 1 开始。
输出语言与原始文档一致。

---

## 原始内容

{{ content }}
```

### 8.2 英文版 `extract_en.jinja2`

结构与中文版完全一致，关键差异：

- 角色描述、规则改为英文
- `anti_patterns` 判断词：`should not / avoid / instead of / never / wrong practice`
- claim 与 card_question 示例换为英文技术场景
- `domain` 候选词改为英文（`Frontend Development`、`Database`、`Networking`）

完整文案在实施时按 8.1 同样的章节顺序逐句翻译；不再于本文档展开，避免与中文版双重维护。

---

## 9. Schema 定义

### 9.1 Agent 内部 Schema `app/agent/schemas.py`

```python
"""Agent 内部数据结构，独立于 processor 契约层。"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator

CORE_CLAIM_TYPES = {
    "concept_definition", "mechanism_principle", "procedure_workflow",
    "config_parameter", "comparison_contrast", "pitfall_anti_pattern",
    "best_practice", "performance_tradeoff",
}


class MetaTag(BaseModel):
    domain: str = Field(min_length=1, max_length=40)
    topics: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("topics")
    @classmethod
    def _trim_topics(cls, v: list[str]) -> list[str]:
        seen, out = set(), []
        for t in v:
            t = (t or "").strip()
            if t and t not in seen and len(t) <= 24:
                seen.add(t)
                out.append(t)
        return out[:8]


class KnowledgeCardQuestion(BaseModel):
    question: str
    explanation: Optional[str] = None


class KnowledgeClaim(BaseModel):
    p_id: str                          # 形如 "n1-p1"
    title: str                         # 5-12 字主题词
    claim: str                         # 完整可验证陈述
    evidence: str                      # 含完整代码围栏
    anti_patterns: list[str] = Field(default_factory=list)
    card_question: KnowledgeCardQuestion


class Note(BaseModel):
    claim_type: str                    # 核心枚举 或 'custom:xxx'
    title: str
    abstract: str = Field(max_length=280)
    claims: list[KnowledgeClaim]

    @field_validator("claim_type")
    @classmethod
    def _valid_type(cls, v: str) -> str:
        if v in CORE_CLAIM_TYPES:
            return v
        if v.startswith("custom:") and v[7:].replace("_", "").isalnum():
            return v
        raise ValueError(f"invalid claim_type: {v}")


class AgentOutput(BaseModel):
    """LLM 单次调用的完整结构化输出。"""
    meta_tag: MetaTag
    notes: list[Note]
```

### 9.2 Processor 契约层（与 Worker 的接口）

`app/services/processor.py` 末尾**追加**（不修改现有 deterministic 路径类型）：

```python
class NoteBundle(BaseModel):
    """单个 Note + 其所有 cards，对应数据库一行 notes + N 行 flashcards。"""
    claim_type: str
    title: str
    abstract: str
    tags: list[str]                    # = MetaTag.topics 中命中本 Note 的子集
    points: list[dict]                 # 含 claim/evidence/anti_patterns/card_question
    card_payloads: list[CardPayload]


class AgentProcessorSuccess(BaseModel):
    meta_tag: MetaTag                  # 文档级元数据
    note_bundles: list[NoteBundle]
    processing_summary: ProcessingSummary


AgentProcessorResult = Union[AgentProcessorSuccess, ProcessorError]
```

> `CardPayload` 在原 processor.py 中已存在，需追加字段：`card_type: str = "qa"`、`explanation: Optional[str] = None`、`claim_ref: Optional[str] = None`。

---

## 10. Orchestrator

### 10.1 设计要点

- 单次 LLM 调用：`router.call("extract", {"content": markdown})` → `dict`
- 用 `AgentOutput.model_validate(...)` 严格校验 LLM 返回
- 校验失败时记录原始输出，重试 1 次；仍失败则返回 `ProcessorError`
- 进度回调与 Worker 解耦：Orchestrator 不持有 DB session

### 10.2 完整实现 `app/agent/orchestrator.py`

```python
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Optional

from pydantic import ValidationError

from app.agent.llm_router import LLMRouter
from app.agent.local_lang import detect_language_local
from app.agent.post_processing import assemble_bundles
from app.agent.schemas import AgentOutput
from app.services.processor import (
    AgentProcessorResult,
    AgentProcessorSuccess,
    ProcessingSummary,
    ProcessorError,
    ProcessorInput,
)

log = logging.getLogger("entropy.agent.orchestrator")
ProgressFn = Callable[[str, int], None]


class AgentOrchestrator:
    def __init__(self, inp: ProcessorInput, update_progress: Optional[ProgressFn] = None):
        self.inp = inp
        self.update_progress = update_progress or (lambda _step, _pct: None)

    def run(self) -> AgentProcessorResult:
        if not self.inp.content.strip():
            return ProcessorError(
                error_code="EMPTY_CONTENT",
                error_message="Markdown 内容为空",
            )

        self.update_progress("detecting_language", 5)
        lang = detect_language_local(self.inp.content)
        log.info("Agent 路由: file=%s source_lang=%s", self.inp.file_name, lang)

        self.update_progress("extracting_knowledge", 20)
        router = LLMRouter(lang)

        agent_output = self._extract_with_retry(router)
        if isinstance(agent_output, ProcessorError):
            return agent_output

        self.update_progress("assembling_bundles", 80)
        meta_tag, bundles = assemble_bundles(agent_output)

        if not bundles:
            return ProcessorError(
                error_code="NO_VALID_CONTENT",
                error_message="LLM 输出未包含任何有效 Note",
            )

        self.update_progress("persisting", 95)
        return AgentProcessorSuccess(
            meta_tag=meta_tag,
            note_bundles=bundles,
            processing_summary=ProcessingSummary(
                point_count=sum(len(b.points) for b in bundles),
                card_count=sum(len(b.card_payloads) for b in bundles),
                source_file=self.inp.file_name,
            ),
        )

    def _extract_with_retry(self, router: LLMRouter) -> AgentOutput | ProcessorError:
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                raw = router.call("extract", {"content": self.inp.content})
                return AgentOutput.model_validate(raw)
            except (ValidationError, ValueError) as e:
                last_error = e
                log.warning("LLM 输出校验失败 (attempt %d): %s", attempt + 1, e)
            except RuntimeError as e:
                last_error = e
                log.warning("LLM 调用失败 (attempt %d): %s", attempt + 1, e)
        return ProcessorError(
            error_code="LLM_OUTPUT_INVALID",
            error_message=f"LLM 输出连续 2 次校验/调用失败: {last_error}",
            debug_hint="检查 prompt 输出格式与 Schema 一致性",
        )


def run_agent_processor(
    inp: ProcessorInput, update_progress: Optional[ProgressFn] = None
) -> AgentProcessorResult:
    try:
        return AgentOrchestrator(inp, update_progress=update_progress).run()
    except Exception as exc:
        log.exception("Agent 处理意外异常")
        return ProcessorError(
            error_code="LLM_UNAVAILABLE",
            error_message=str(exc) or "Agent 处理失败",
            debug_hint="检查 LLM API Key 与网络连通性",
        )
```

### 10.3 ProcessingTask.current_step 枚举

| step                  | 进度 |
| --------------------- | ---- |
| `detecting_language`  | 5%   |
| `extracting_knowledge` | 20% |
| `assembling_bundles`  | 80%  |
| `persisting`          | 95%  |
| `completed`           | 100% |

---

## 11. 本地后处理

### 11.1 claim_type → card_type 机械映射

```python
# app/agent/post_processing.py

from app.agent.schemas import AgentOutput, MetaTag
from app.services.processor import NoteBundle, CardPayload

CLAIM_TYPE_TO_CARD_TYPE: dict[str, str] = {
    "concept_definition":    "qa",
    "mechanism_principle":   "qa",
    "procedure_workflow":    "fill_in_blank",
    "config_parameter":      "fill_in_blank",
    "comparison_contrast":   "qa",
    "pitfall_anti_pattern":  "error_correction",
    "best_practice":         "qa",
    "performance_tradeoff":  "qa",
}


def derive_card_type(claim_type: str, evidence: str) -> str:
    """LLM 不再判断 card_type，全部由 claim_type 机械派生。"""
    if claim_type.startswith("custom:"):
        return "fill_in_blank" if "```" in evidence else "qa"
    base = CLAIM_TYPE_TO_CARD_TYPE.get(claim_type, "qa")
    if base == "qa" and "```" in evidence:
        return "fill_in_blank"
    return base
```

### 11.2 Bundle 组装

```python
def assemble_bundles(agent_output: AgentOutput) -> tuple[MetaTag, list[NoteBundle]]:
    """把 LLM 输出转换为 Worker 可直接持久化的 NoteBundle 列表。"""
    bundles: list[NoteBundle] = []
    seen_types: dict[str, NoteBundle] = {}     # 防御性合并：重复 claim_type

    for note in agent_output.notes:
        if not note.claims:
            continue                                          # 空 Note 跳过

        points, cards = [], []
        for c in note.claims:
            if not (c.claim or "").strip():
                continue                                      # 空 claim 跳过
            answer = f"{c.claim}\n\n{c.evidence}".strip()
            cards.append(CardPayload(
                point_id=c.p_id,
                question=c.card_question.question or f"{c.title} 的核心机制是什么？",
                answer=answer,
                card_type=derive_card_type(note.claim_type, c.evidence),
                explanation=c.card_question.explanation,
                claim_ref=c.p_id,
            ))
            points.append({
                "p_id": c.p_id,
                "title": c.title,
                "body": c.claim,                              # 兼容旧 UI（body=claim 全文）
                "claim": c.claim,
                "evidence": c.evidence,
                "anti_patterns": c.anti_patterns,
                "card_question": c.card_question.model_dump(),
                "hooks": [],
            })

        if not points:
            continue

        # tags = MetaTag.topics 中"命中本 Note 文本"的子集
        hit_topics = [
            t for t in agent_output.meta_tag.topics
            if t in note.title or t in note.abstract or
               any(t in p["claim"] for p in points)
        ]

        if note.claim_type in seen_types:
            # 防御性合并：同一 claim_type 出现多次 → 拼接 claims
            existing = seen_types[note.claim_type]
            existing.points.extend(points)
            existing.card_payloads.extend(cards)
            for t in hit_topics:
                if t not in existing.tags:
                    existing.tags.append(t)
            continue

        bundle = NoteBundle(
            claim_type=note.claim_type,
            title=note.title,
            abstract=note.abstract[:280],
            tags=hit_topics,
            points=points,
            card_payloads=cards,
        )
        bundles.append(bundle)
        seen_types[note.claim_type] = bundle

    return agent_output.meta_tag, bundles
```

---

## 12. Worker 集成

`app/worker.py` 共 **三处** 改动，其余代码保持不变。

### 12.1 改动 1：顶部 import 块末尾追加

```python
import os
from app.agent.orchestrator import run_agent_processor
from app.services.processor import AgentProcessorSuccess

_AGENT_ENABLED = os.getenv("ENTROPY_AGENT", "1") == "1"
```

### 12.2 改动 2：替换调用点

定位 `process_job()` 中调用 processor 的那一行（旧实现是 `result = run_deterministic_processor(inp)`），替换为：

```python
if _AGENT_ENABLED:
    def _on_progress(step: str, percent: int) -> None:
        # 同步回调：worker 内部用同步 Session 提交进度更新
        # 实际实现按当前 worker 的事务模型选择，伪代码示意
        with sync_session() as s:
            t = s.get(ProcessingTask, job.task_id)
            if t:
                t.current_step = step
                t.progress_percent = percent
                s.commit()

    result = run_agent_processor(inp, update_progress=_on_progress)
else:
    result = run_deterministic_processor(inp)
```

### 12.3 改动 3：持久化路径分叉

定位现有持久化块（旧的"删除原 Note → 写入新 Note + Flashcards"），替换为以下 **双分支**：

```python
await session.execute(
    delete(Note).where(Note.raw_id == job.raw_id, Note.user_id == job.user_id)
)

if isinstance(result, AgentProcessorSuccess):
    # ── Agent 路径（多 Note + MetaTag）───────────────────────
    raw2.meta_tag_json = result.meta_tag.model_dump()

    first_note_id: str | None = None
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
            claim_type=bundle.claim_type,
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
                card_type=card.card_type,
                explanation=card.explanation,
                claim_ref=card.claim_ref,
            ))
            total_cards += 1
    task2.note_id = first_note_id
    task2.flashcard_count = total_cards

else:
    # ── deterministic fallback（仅 ENTROPY_AGENT=0 时进入）──
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
        {"p_id": p.get("p_id", f"p_{i}"),
         "title": p.get("title", ""),
         "body": p.get("body", "")}
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
task2.current_step = "completed"
task2.progress_percent = 100
task2.error_msg = None
```

---

## 13. 数据库 Migration & ORM 模型扩展

### 13.1 Migration `database/migrations/003_claim_type_meta_tag.sql`

```sql
-- raw_knowledge: 文档级元数据
ALTER TABLE raw_knowledge
  ADD COLUMN IF NOT EXISTS meta_tag_json JSONB;

CREATE INDEX IF NOT EXISTS idx_raw_meta_domain
  ON raw_knowledge ((meta_tag_json->>'domain'));

CREATE INDEX IF NOT EXISTS idx_raw_meta_topics
  ON raw_knowledge USING GIN ((meta_tag_json->'topics'));

-- notes: 类型主轴
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS claim_type VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_notes_claim_type
  ON notes (claim_type);

CREATE INDEX IF NOT EXISTS idx_notes_user_claim_type
  ON notes (user_id, claim_type);

-- flashcards: 卡片元数据（沿用 propose-3 的字段定义，归并到本次 migration）
ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'qa';
ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS claim_ref VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_flashcards_claim_ref
  ON flashcards (claim_ref);
```

> SQLite（本地开发）等价语法：去掉 `JSONB`（用 `TEXT`）、去掉 `USING GIN`（SQLite 只能用普通索引）。

### 13.2 ORM 模型扩展 `app/db/models.py`

```python
# RawKnowledge 新增列
meta_tag_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

# Note 新增列
claim_type: Mapped[Optional[str]] = mapped_column(String(60), nullable=True, index=True)

# Flashcard 新增列
card_type:   Mapped[str]            = mapped_column(String(20), default="qa")
explanation: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
claim_ref:   Mapped[Optional[str]]  = mapped_column(String(100), nullable=True, index=True)
```

> 索引设计目标：支持前端"按 domain 筛选 / 按 topics 多选 / 按 claim_type 分组"三种查询路径。

---

## 14. 环境变量

`backend/.env.example` 应包含（实际密钥写在 gitignore 的 `.env.local`）：

```ini
# ── AI Agent 主路径 ─────────────────────────────────────
ENTROPY_AGENT=1                        # 1=启用 Agent 路径；0=fallback 到 deterministic
AI_MAX_TOKENS=4096                     # 单次调用最大 token

# 中文模型（阿里云百炼，OpenAI 兼容端点）
DASHSCOPE_API_KEY=                     # 真值写到 .env.local

# 英文模型（Google Gemini，OpenAI 兼容端点）
# 当前仅处理中文知识，此 Key 可暂不配置；后续接入英文文档时填入
GEMINI_API_KEY=
```

### 14.1 `.env.local` 加载

`python-dotenv.load_dotenv()` 默认只加载 `.env`，不自动加载 `.env.local`。
在 `backend/app/db/database.py` 与 `backend/app/db/supabase.py` 的 `load_dotenv()` 行后追加：

```python
load_dotenv()                             # 基础配置
load_dotenv(".env.local", override=True)  # 本地 secrets，覆盖 .env
```

确认 `.gitignore` 包含 `*.local` 以避免泄漏。

### 14.2 `app/core/config.py` 新增 getter

```python
def get_dashscope_api_key() -> str | None:
    return os.getenv("DASHSCOPE_API_KEY") or None

def get_gemini_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or None

def get_ai_max_tokens() -> int:
    return int(os.getenv("AI_MAX_TOKENS", "4096"))
```

---

## 15. 文件结构与变更清单

### 15.1 目标目录结构

```
backend/app/agent/
├── __init__.py
├── local_lang.py                     # 本地语言检测（无 LLM）
├── llm_router.py                     # LLMRouter：按语言路由模型 + Prompt
├── orchestrator.py                   # AgentOrchestrator + run_agent_processor
├── post_processing.py                # claim_type→card_type、assemble_bundles
├── schemas.py                        # AgentOutput / Note / KnowledgeClaim / MetaTag
└── prompts/
    ├── extract_zh.jinja2             # 中文一体化大 Prompt
    └── extract_en.jinja2             # 英文一体化大 Prompt

backend/app/services/
└── processor.py                      # 追加 AgentProcessorSuccess / NoteBundle

backend/app/
└── worker.py                         # 三处改动（见 §12）

database/migrations/
└── 003_claim_type_meta_tag.sql       # DB 扩展
```

### 15.2 删除文件

```
app/agent/lang_detector.py                            # 替换为 local_lang.py
app/agent/claim_extractor.py                          # 合并入大 Prompt
app/agent/card_generator.py                           # Card 内嵌于 Point
app/agent/hooks_resolver.py                           # Phase 2.1 占位，移除
app/agent/note_partitioner.py                         # 语义分组由 LLM 完成
app/agent/structure_analyzer.py                       # 不再依赖 Markdown 结构
app/agent/prompts/claim_extraction_zh.jinja2          # 废弃
app/agent/prompts/claim_extraction_en.jinja2          # 废弃
app/agent/prompts/card_generation_zh.jinja2           # 废弃
app/agent/prompts/card_generation_en.jinja2           # 废弃
```

### 15.3 新增文件

| 文件                                              | 说明                       |
| ------------------------------------------------- | -------------------------- |
| `app/agent/local_lang.py`                         | §6.1 完整代码              |
| `app/agent/post_processing.py`                    | §11 完整代码               |
| `app/agent/prompts/extract_zh.jinja2`             | §8.1 完整 Prompt           |
| `app/agent/prompts/extract_en.jinja2`             | §8.2（按 §8.1 翻译）        |
| `database/migrations/003_claim_type_meta_tag.sql` | §13.1                      |

### 15.4 修改文件

| 文件                          | 改动                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `app/agent/orchestrator.py`   | 重写为 §10.2                                                              |
| `app/agent/llm_router.py`     | 重写为 §7.2（含 fallback、JSON 容错解析）                                  |
| `app/agent/schemas.py`        | 替换为 §9.1                                                                |
| `app/services/processor.py`   | 末尾追加 §9.2 类型；`CardPayload` 增补字段                                 |
| `app/worker.py`               | §12 三处改动                                                               |
| `app/db/models.py`            | §13.2 ORM 列                                                               |
| `app/db/database.py`          | §14.1 追加 `.env.local` 加载                                               |
| `app/db/supabase.py`          | §14.1 追加 `.env.local` 加载                                               |
| `app/core/config.py`          | §14.2 三个 getter                                                          |
| `backend/.env.example`        | §14 环境变量定义                                                           |

---

## 16. 错误处理

| 异常场景                              | 处理策略                                                      |
| ------------------------------------- | ------------------------------------------------------------- |
| LLM 返回非合法 JSON                   | LLMRouter 内 `_parse_json` 自动剥离 ```json ``` 包装；仍失败 → 触发 fallback |
| LLM 限流（RateLimitError）            | 指数退避重试 3 次（1s/2s/4s），仍失败 → fallback              |
| Schema 校验失败（pydantic ValidationError） | Orchestrator 重试 LLM 调用 1 次；仍失败 → `ProcessorError("LLM_OUTPUT_INVALID")` |
| `meta_tag.domain` 为空                | Schema validator 拒绝 → 进入校验失败重试路径                  |
| `meta_tag.topics` 为空数组            | 接受（不算错误），前端显示"无主题"                            |
| `claim_type` 不在白名单且无 `custom:` 前缀 | Schema validator 抛 `ValueError` → 进入校验失败重试路径       |
| 同一 `claim_type` 出现多次            | `assemble_bundles` 防御性合并（拼接 claims），记录 warning   |
| `claims` 为空数组的 Note              | 跳过该 Note                                                   |
| `claim` 为空的 point                  | 跳过该 claim                                                  |
| `card_question.question` 为空         | fallback：`"{title} 的核心机制是什么？"`                       |
| 全部 Note 都被跳过                    | 返回 `ProcessorError("NO_VALID_CONTENT")`                     |
| LLM API Key 缺失                      | LLMRouter 构造时抛 `RuntimeError`；Orchestrator 包装为 `LLM_UNAVAILABLE` |

---

## 17. 实施顺序

| 阶段 | 内容                                                            | 验收                                          |
| ---- | --------------------------------------------------------------- | --------------------------------------------- |
| P0   | 写 003 migration & 更新 ORM Model                               | `psql ... < 003_*.sql` 成功；ORM 启动无报错   |
| P0   | 实现 `local_lang.py` + 单元测试                                 | §6.2 全部用例通过                             |
| P0   | 实现 `schemas.py` + `post_processing.py`                        | pydantic 自检通过；fixture JSON 能装配为 Bundle |
| P0   | 编写 `extract_zh.jinja2`，手动跑 1 份真实文档验证 JSON 输出质量 | LLM 输出能通过 Schema 校验                    |
| P0   | 实现 `llm_router.py`（含 fallback）                             | 单元测试：mock OpenAI 客户端，断言重试与 fallback |
| P0   | 重写 `orchestrator.py`                                          | E2E：上传文档 → DB 含 meta_tag + N 个 Note    |
| P1   | Worker 三处改动 + 进度回调                                      | 任务进度按 §10.3 五个阶段推进                 |
| P1   | 翻译 `extract_en.jinja2`，跑 1 份英文文档                       | 英文路径与中文路径输出结构一致                |
| P1   | 删除 §15.2 列出的所有废弃文件                                   | `pytest` + 启动后端均无导入错误               |
| P2   | 前端按 `domain` / `topics` / `claim_type` 筛选与聚合视图        | 独立 UI change，本方案不涵盖                  |

---

## 18. 风险与注意事项

| 风险                                  | 级别 | 缓解措施                                                                |
| ------------------------------------- | ---- | ----------------------------------------------------------------------- |
| LLM 倾向过度使用 `custom:` 前缀       | 中   | Prompt 明确"仅在确有必要时使用"；Worker 监控 custom 比例 > 30% 时告警    |
| LLM 把不同 claim_type 的内容塞进同一 Note | 中   | `assemble_bundles` 防御性合并 + 记录 warning                            |
| `card_question` 仍泄露 claim 关键词   | 中   | 后处理时做关键词重叠检测（jaccard > 0.5 时记录 warning，不阻断）        |
| MetaTag.domain 命名漂移               | 中   | 定期统计高频 domain，整理为受控词表 → 反哺 Prompt 候选词                |
| 单次大调用超 token 上限               | 中   | 文档 > 8k tokens 时按段落语义切分，分批调用，结果合并；初期不实现，先抛错 |
| 数据库已有数据无 claim_type / meta_tag | 低   | 迁移后字段允许 NULL；前端以"未分类"处理；后台脚本按需回填               |
| LLM 输出包含 ```json ``` 包装         | 低   | LLMRouter `_parse_json` 自动剥离                                        |

---

## 19. 与 propose-3 的差异对照

| 维度                              | propose-3                  | 本方案                                            |
| --------------------------------- | -------------------------- | ------------------------------------------------- |
| Note 分组依据                     | 主题内聚性（开放）         | **KnowledgeClaimType（半开放枚举）**              |
| 文档级元数据                      | 无（tags 散落各 Note）     | **MetaTag = { domain, topics[] }**                |
| Claim ↔ CardQuestion 关系        | 串行                       | **协同微调**                                      |
| card_type 决策                    | 本地规则（基于 claim 内容） | **本地规则（基于 claim_type，更稳定）**           |
| 跨文档聚合                        | 弱                         | **强**（claim_type / domain / topics 三轴可索引） |
| LLM 调用次数                      | 1                          | 1                                                 |
| 数据库改动                        | 仅 flashcards              | flashcards + **notes.claim_type** + **raw_knowledge.meta_tag_json** |
| Schema 复杂度                     | NoteBundle + Point         | NoteBundle + Point + **MetaTag** + **claim_type** |

---

## 20. 不在本次范围内

- 前端筛选/聚合 UI 实现（独立 UI change）
- 跨文档 Hooks（Phase 2.1，沿用延后策略）
- 自定义 claim_type 的"提升为核心类型"工作流
- FSRS 调度对 card_type 的差异化处理
- 大文档（> 8k tokens）的分批调用与结果合并
- 混合语言文档处理（同一文件中中英文混排）

---

## 21. OpenSpec change 落地建议

> 本设计可直接转写为 OpenSpec change，命名建议：`claim-type-driven-agent-redesign`

子目录结构：

```
openspec/changes/claim-type-driven-agent-redesign/
├── proposal.md                                    （摘要 + Why + What changes）
├── design.md                                      （= 本文档主体）
├── tasks.md                                       （按 §17 拆解为可执行任务）
└── specs/
    ├── claim-type-taxonomy/spec.md                （新 capability：8 类 + 半开放）
    ├── document-meta-tag/spec.md                  （新 capability：MetaTag）
    ├── single-call-extraction/spec.md             （新 capability：1 次调用范式）
    └── bilingual-llm-routing/spec.md              （沿用 propose-3 的 spec，补充 extract prompt）
```

> 是否生成 OpenSpec change，等本设计文档评审通过后再决定。
