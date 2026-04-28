# Agent 单次调用重构方案（Propose-3 · 修订版）

> 状态：待实施  
> 背景：当前多轮 LLM 调用方案（13+ 次/文档）造成严重的时延和 token 浪费；  
> 此外，旧方案存在根本性设计错误——依赖 Markdown 标题结构，且 card 生成需要独立一轮 LLM 调用。  
> 本方案将 LLM 调用次数收敛为 **1 次**，并修正架构。

---

## 一、现状问题诊断

### 1.1 当前调用链路

```
语言检测（1次 LLM）
    ↓
结构分析（按 ## 标题拆 section）
    ↓
并行提取 claims（每 section 1次 LLM）  ← N 次
    ↓
按 section 分组 note bundles（本地）
    ↓
并行生成卡片（每 bundle 1次 LLM）     ← M 次
    ↓
组装 ProcessorSuccess（notes[] + cards[] 分离）
```

**实际调用次数（典型文档 6个 section）：**

总调用 = 1 + 6 + 6 = 13 次

### 1.2 问题清单

| #   | 问题                                         | 影响                                                            |
| --- | -------------------------------------------- | --------------------------------------------------------------- |
| 1   | 语言检测用大模型（max_tokens=8）             | 浪费，每次 1-2 秒                                               |
| 2   | 每个 section 独立 LLM 调用                   | N 次，耗时被最慢一批限制                                        |
| 3   | 每个 bundle 再次独立 LLM 调用                | M 次，重复建连                                                  |
| 4   | **依赖 `##` 标题拆分分组**                   | 原始知识文档往往无标准结构，分组结果随机                        |
| 5   | **card 作为顶层独立数组**                    | notes[] + cards[] 两套数组，point_id 引用脆弱，且需要第二轮 LLM |
| 6   | `hooks_resolver.py` 是 Phase2 占位，完全无效 | 代码噪音                                                        |
| 7   | Prompt 文件碎片化（4 个 jinja2）             | 维护成本高，上下文割裂                                          |

### 1.3 根本性设计假设错误

> **旧方案假设**：原始知识文档有规范的 `##` 二级标题，可以按标题边界拆分 section。  
> **实际情况**：用户上传的原始知识文档格式可能非常随意，可能是：
> - 流水账式的笔记
> - 复制粘贴的网页内容
> - 多个主题混杂的文字
> - 有标题但标题与内容不对应

正确的做法是：**LLM 理解语义，按主题内聚性主动分组**，而非依赖文档格式。

---

## 二、新方案设计

### 2.1 核心原则

1. **语言检测本地化**：字符统计，< 1ms，无需 LLM
2. **1 次 LLM 调用** 完成全部提炼
3. **Card 内嵌于 Point**：每个知识点包含自己的复习卡问题，消除独立的 card 生成步骤
4. **语义分组**：LLM 按主题内聚性自行划分笔记，不依赖 Markdown 格式

### 2.2 新调用链路

```
本地语言检测（字符统计，< 1ms）
    ↓
渲染大 Prompt（传入完整原始内容）
    ↓
单次 LLM 调用
    ↓
    输出 JSON：
    {
      metadata: { source_lang, domain },
      notes: [
        {
          title, abstract, tags,
          points: [
            {
              p_id, title, claim, body, evidence, anti_patterns,
              card: { question, explanation }
            }
          ]
        }
      ]
    }
    ↓
本地 JSON 解析 + 容错修复
    ↓  
card.answer  = claim + evidence（本地拼接，无需 LLM）
card_type    = 本地规则判断
    ↓
返回 ProcessorSuccess（worker 存库）
```

### 2.3 架构层级关系

```
RawKnowledge（原始文档）
    └── Note（笔记，按语义主题分组）
            └── Point（原子知识点）
                    └── Card（复习卡，内嵌在 Point 中）
                            ├── question（LLM 生成）
                            ├── answer（本地拼接：claim + evidence）
                            └── card_type（本地判断）
```

**Card 的 answer 和 card_type 由本地处理，LLM 只需生成 question。**

### 2.4 耗时对比

| 维度                   | 旧方案                 | 新方案             |
| ---------------------- | ---------------------- | ------------------ |
| LLM 调用次数           | 1 + N + M（典型 13次） | **1 次**           |
| 网络往返开销           | 13×（建连+传输）       | **1×**             |
| 处理总时长（典型文档） | 30-90 秒               | **10-20 秒**       |
| Token 固定开销         | 13× Prompt 前缀        | **1×**             |
| 依赖文档格式           | 是（`##` 标题）        | **否（语义分组）** |

### 2.5 Card Type 本地判断（不由 LLM 判断）

```python
def _decide_card_type(claim: str, evidence: str) -> str:
    _ERROR_SIGNALS = (
        "不应该", "应避免", "错误做法", "禁止", "反例",
        "should not", "avoid", "instead of", "never", "wrong",
    )
    if any(s in claim for s in _ERROR_SIGNALS):
        return "error_correction"
    if "```" in evidence:
        return "fill_in_blank"
    return "qa"
```

---

## 三、本地语言检测

取文档前 500 字符中的前 100 个**有效字符**（过滤 Markdown 标记、数字、URL、空白），统计 CJK 字符占比：

- CJK 占比 ≥ 25% → `zh`
- CJK 占比 < 25% → `en`
- 有效字符 < 20 → 默认 `zh`

```python
# app/agent/local_lang.py
import re

_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
_STRIP_RE = re.compile(r"[#*`\->\[\]()\d\s]|https?://\S+")

def detect_language_local(text: str) -> str:
    cleaned = _STRIP_RE.sub("", text[:500])[:100]
    if len(cleaned) < 20:
        return "zh"
    cjk_count = len(_CJK_RE.findall(cleaned))
    return "zh" if cjk_count / len(cleaned) >= 0.25 else "en"
```

---

## 四、输出 JSON Schema

LLM 完整输出结构：

```json
{
  "metadata": {
    "source_lang": "zh",
    "domain": "领域关键词，如 'JavaScript'、'CSS'、'网络'"
  },
  "notes": [
    {
      "title": "本组主题的简洁标题（LLM 自行命名）",
      "abstract": "≤280字，概括本 note 的核心内容",
      "tags": ["关键词1", "关键词2"],
      "points": [
        {
          "p_id": "n1-p1",
          "title": "知识点主题词，简洁（5-12字），用于复习提问",
          "claim": "核心断言：一句完整可验证的陈述，不能是标题或模糊描述",
          "body": "详细说明，展开 claim，可含代码块",
          "evidence": "支撑证据，含完整 ``` 代码围栏，直接从原文提取",
          "anti_patterns": ["仅在原文明确提到错误做法时才填写，否则空数组"],
          "card": {
            "question": "只基于 title 提问，不泄露 claim 中的关键词",
            "explanation": null
          }
        }
      ]
    }
  ]
}
```

**设计要点：**

- 没有顶层 `cards[]`，card 内嵌于每个 point，消除跨数组引用的脆弱性
- `card.answer` 由 worker 本地拼接（`claim + "\n\n" + evidence`），无需 LLM
- `card.card_type` 由 worker 本地判断，无需 LLM
- LLM 只需生成 `card.question` 这一个 card 字段

---

## 五、大 Prompt 设计

### 5.1 质量准则（参照 SKILL.md）

> 输出会被一个学过这个主题、2-4 周后彻底忘记的人阅读，他没有原文。  
> 他必须仅凭这张复习卡就能重建完整理解。

由此推导：
- `claim` 不能是标题或简单转述，必须是完整的可验证陈述
- `evidence` 必须保留完整代码围栏，包含足够的上下文
- `card.question` 不能暴露 claim 中的关键词（否则无考查价值）
- `anti_patterns` 不默认填写，必须来自原文的明确反例（不虚构）

### 5.2 中文 Prompt 模板（extract_zh.jinja2）

```jinja2
你是专业的知识提炼专家。请从以下原始内容中提炼结构化笔记与复习卡片。

## 重要前提

原始内容可能格式混乱、没有标题、多主题混杂，这是正常的。
你的任务是理解语义内容，**不依赖 Markdown 标题格式**进行分组。

## 第一步：语义分组（划分 Notes）

将原始内容按**主题内聚性**划分为若干 Note：
- 同一技术机制/概念/特性 → 归入同一 Note
- 不同主题 → 分为不同 Note
- Note 数量由内容决定（通常 1-6 个），不要强行合并或拆分
- Note 的 title 由你自行命名，反映该组核心主题

## 第二步：提炼知识点（points）

每个 Note 内提炼若干原子知识点，每个 point 包含：

**title**：主题词，简洁（5-12字），**只描述主题，不包含结论**，用于复习时提问。
**claim**：核心断言，一句完整、可验证的陈述。不能是标题或模糊描述。
  - ✅ 正确："`overflow: hidden` 可以触发 BFC，使容器能包含浮动子元素"
  - ❌ 错误："BFC 的触发条件"（这是标题，不是断言）
**body**：展开说明，可以多句话，可含代码块。
**evidence**：从原文中直接提取的支撑材料。代码块必须保留完整的 ``` 围栏（含语言标识）。
**anti_patterns**：**仅当原文明确描述了错误做法或反例时才填写**，否则为空数组 `[]`。禁止虚构。

每个 Note 的 point 数量：1-6 个，按实际内容决定，不要强行凑数。

## 第三步：生成复习问题（card.question）

每个 point 生成恰好 1 个复习问题：
- **只基于 title 提问**，禁止暴露 claim 中的关键词或结论
- 问题要能引导读者回忆出 claim 的完整内容
  - ✅ "BFC 的触发方式有哪些效果？"
  - ❌ "`overflow: hidden` 如何通过触发 BFC 包含浮动？"（暴露了 claim 关键词）
- `explanation`：可选补充解释，与 claim + evidence 内容不重复；无补充则 null

## 输出格式

只输出一个合法的 JSON 对象，禁止输出 Markdown 代码围栏包装、注释、解释文字。

p_id 格式：`n{note序号}-p{point序号}`，从 1 开始，如 `n1-p1`、`n2-p3`。

输出语言与原始文档语言一致（本文档为中文，输出中文）。

## 原始内容

{{ content }}
```

### 5.3 英文 Prompt 模板（extract_en.jinja2）

结构与中文版完全一致，角色说明和规则改为英文，关键差异：
- `anti_patterns` 判断词：`should not / avoid / instead of / never / wrong practice`
- claim 示例换为英文技术场景

---

## 六、Worker 本地处理逻辑

LLM 返回 JSON 后，Worker 本地完成以下处理（不再调用 LLM）：

```python
def _parse_llm_output(
    raw: dict, inp: ProcessorInput
) -> tuple[list[NotePayload], list[CardPayload]]:
    note_payloads = []
    card_payloads = []

    for note_idx, note_data in enumerate(raw.get("notes", []), 1):
        points_out = []
        for pt in note_data.get("points", []):
            p_id = pt.get("p_id") or f"n{note_idx}-p{len(points_out)+1}"
            claim = (pt.get("claim") or "").strip()
            evidence = (pt.get("evidence") or "").strip()

            if not claim:  # claim 为空的 point 跳过
                log.warning("跳过空 claim 的 point: %s", p_id)
                continue

            # answer 本地拼接（不由 LLM 生成）
            answer = f"{claim}\n\n{evidence}".strip()

            # card_type 本地判断（不由 LLM 判断）
            card_type = _decide_card_type(claim, evidence)

            card = pt.get("card") or {}
            question = (card.get("question") or "").strip()
            if not question:
                question = f"{pt.get('title', '该知识点')} 的核心机制是什么？"

            card_payloads.append(CardPayload(
                point_id=p_id,
                question=question,
                answer=answer,
                card_type=card_type,
                explanation=card.get("explanation"),
                claim_ref=p_id,
            ))

            points_out.append({
                "p_id": p_id,
                "title": pt.get("title", ""),
                "body": pt.get("body", ""),
                "claim": claim,
                "evidence": evidence,
                "anti_patterns": pt.get("anti_patterns") or [],
                "hooks": [],
            })

        if not points_out:
            continue

        note_payloads.append(NotePayload(
            title=note_data.get("title") or "未命名笔记",
            abstract=(note_data.get("abstract") or "")[:280],
            tags=note_data.get("tags") or [],
            points=points_out,
        ))

    return note_payloads, card_payloads
```

---

## 七、容错策略

| 异常场景              | 处理方式                                             |
| --------------------- | ---------------------------------------------------- |
| 输出不是合法 JSON     | 剥离 ```json ``` 包装后重试；仍失败则 ProcessorError |
| note.points 为空      | 跳过该 note，记录 warning                            |
| p_id 格式不合法或缺失 | 本地重新生成 `n{i}-p{j}`                             |
| claim 为空            | 跳过该 point，记录 warning                           |
| card.question 缺失    | fallback：`"{title} 的核心机制是什么？"`             |
| anti_patterns 为 null | 替换为 `[]`                                          |
| abstract 超 280 字    | 本地截断                                             |

---

## 八、文件变更清单

### 8.1 删除

| 文件                                           | 原因                            |
| ---------------------------------------------- | ------------------------------- |
| `app/agent/lang_detector.py`                   | 替换为本地字符统计              |
| `app/agent/claim_extractor.py`                 | 逻辑合并到大 Prompt             |
| `app/agent/card_generator.py`                  | Card 内嵌于 Point，无需独立生成 |
| `app/agent/hooks_resolver.py`                  | Phase2 占位，无实际功能         |
| `app/agent/note_partitioner.py`                | 语义分组由 LLM 完成             |
| `app/agent/structure_analyzer.py`              | 不再依赖 Markdown 结构          |
| `app/agent/prompts/claim_extraction_zh.jinja2` | 废弃                            |
| `app/agent/prompts/claim_extraction_en.jinja2` | 废弃                            |
| `app/agent/prompts/card_generation_zh.jinja2`  | 废弃                            |
| `app/agent/prompts/card_generation_en.jinja2`  | 废弃                            |

### 8.2 新增

| 文件                                  | 说明                 |
| ------------------------------------- | -------------------- |
| `app/agent/local_lang.py`             | 本地字符统计语言检测 |
| `app/agent/prompts/extract_zh.jinja2` | 中文一体化大 Prompt  |
| `app/agent/prompts/extract_en.jinja2` | 英文一体化大 Prompt  |

### 8.3 修改

| 文件                        | 改动内容                                                       |
| --------------------------- | -------------------------------------------------------------- |
| `app/agent/orchestrator.py` | 重写 `run()`：本地语言检测 → 单次 LLM → 本地解析               |
| `app/agent/schemas.py`      | 移除 `NoteBundle`、`CoreClaim`、`Evidence`、`FlashcardPayload` |
| `app/agent/llm_router.py`   | 新增 `extract` prompt 路径；`max_tokens` 调整为 4096           |

---

## 九、实施顺序

1. 实现 `local_lang.py` 并单测
2. 编写大 Prompt，手动测试 JSON 输出质量（用真实乱序文档）
3. 重写 `orchestrator.py` 主流程
4. 更新 `llm_router.py`
5. 删除废弃文件
6. 清理 `schemas.py`
7. 端到端测试（上传乱序文档 → 验证 notes + cards 输出）

---

## 十、风险与注意事项

| 风险                               | 级别 | 缓解措施                                                  |
| ---------------------------------- | ---- | --------------------------------------------------------- |
| LLM 偶尔在 JSON 外包裹 ```json ``` | 中   | 解析前主动剥离                                            |
| 超长文档（>10k tokens）被截断      | 中   | 本地按语义段落分批，每批一次 LLM，结果合并                |
| 语义分组质量依赖模型能力           | 中   | 用多份真实"乱序文档"评测，Prompt 需含示例                 |
| anti_patterns 被 LLM 虚构          | 中   | Prompt 强调"仅原文明确提到才填写"                         |
| 单次失败即全部失败                 | 低   | LLMRouter 已有 3 次重试；整体 try/except → ProcessorError |

