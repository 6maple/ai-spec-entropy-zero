# Proposal: 增强 AI Agent - 集成 ingest-json-auto Skill

## 概述

当前 agent 架构已启用（见 Proposal 1），但生成质量与 ingest-json-auto skill 的标准仍有差距。本变更将整合 skill 的核心规则，提升笔记和卡片质量。

## 问题陈述

### 当前 Agent vs. Ingest Skill 对比

```
当前 Agent                    Ingest-json-auto Skill
═══════════════════════════════════════════════════════

claim_extractor              ✓ 原子化 core_claims
  ├─ 提取 topic + assertion     ├─ evidence 包含完整上下文
  ├─ 简单 evidence              ├─ source_lines 精确追溯
  └─ anti_patterns（可选）      └─ anti_patterns 主动扫描

card_generator               ✓ 严格 1:1 映射
  ├─ 基于 claim 生成卡片        ├─ 问题从 topic 生成（不泄露 assertion）
  ├─ 可能重复内容              ├─ answer vs explanation 分层
  └─ 类型判断简单              └─ 类型基于机械规则（对比词 → error_correction）

hooks_resolver               ✓ 跨笔记关联
  ├─ 简单关联                  ├─ 扫描 index.json
  └─ 可能漏检                  └─ no_hook_reason 记录

note_partitioner             ✓ 主题聚类
  ├─ 基于 heading               ├─ 基于语义相似度
  └─ 可能过度切分              └─ 1..N notes（不是 1 per file）
```

### 质量差距示例

**Claim 提取**：
```json
// 当前 Agent
{
  "topic": "大文件上传",
  "assertion": "使用切片上传",
  "evidence": { "description": "..." }
}

// Ingest Skill 标准
{
  "claim": "大文件上传应先将文件切成固定大小的 Blob 片段，再通过并发控制队列或 Promise.all 批量上传这些切片。",
  "evidence": {
    "description": "完整段落 + 代码块 + 关键步骤",
    "source_lines": [16, 18, 19, 21, 22, ...]
  }
}
```

**Card 生成**：
```json
// 当前 Agent（可能泄露）
{
  "question": "什么是大文件上传的切片方法？",  // 问题包含了关键词
  "answer": "使用 File.slice()"
}

// Ingest Skill 标准
{
  "question": "为什么大文件上传通常要先把文件切成固定大小的片段？",  // 从场景出发
  "answer": "为了避免网络中断和内存溢出...",
  "explanation": "大文件直接上传容易因为连接中断或浏览器内存峰值失败..."  // 深层原理
}
```

## 解决方案

### 核心原则：学习者视角优先

> "输出将被一个学习过这个主题、然后 2-4 周后打开复习卡、已经忘记大部分的人阅读。那个人无法访问原文。他们必须能够仅从卡片重建完整理解。"

这是判断所有输出质量的唯一标准。

### 1. 增强 Claim 提取

**目标文件**：`app/agent/claim_extractor.py`

**改进点**：

```python
# 1. Prompt 改进 - 强调原子性和完整性
CLAIM_EXTRACTION_PROMPT = """
从以下段落中提取原子化的核心声明（core claims）。

**原子化要求**：
- 每个 claim 只包含一个可独立测试的知识点
- 如果两个技巧可以独立应用，拆分为两个 claims
- claim 文本应完整，不依赖上下文

**Evidence 要求**：
- 包含足够上下文让读者重建理解（代码块、步骤、对比）
- 不是简单重复 assertion，而是提供证据和深度
- source_lines 必须精确标注

**Anti-patterns 要求**：
- 主动扫描错误做法的信号词（"忽略"、"不要"、"避免"、"错误"）
- 如果没有，返回空数组（不要编造）

输入段落：
{source_slice}

返回 JSON：
{{
  "core_claims": [
    {{
      "topic": "场景或问题描述",
      "assertion": "完整的解决方案或知识点陈述",
      "evidence": {{
        "description": "包含代码/步骤/对比的完整证据",
        "source_lines": [1, 2, 3]
      }},
      "anti_patterns": ["错误做法1", "错误做法2"],
      "source_lines": [1, 2, 3, 4, 5]
    }}
  ]
}}
"""

# 2. 验证逻辑增强
def _validate_claims(raw: dict, section: SectionMeta) -> list[CoreClaim]:
    claims: list[CoreClaim] = []
    for idx, item in enumerate(raw.get("core_claims", []), start=1):
        # 检查 claim 完整性
        assertion = (item.get("assertion") or "").strip()
        if len(assertion) < 10:  # 太短无法独立理解
            log.warning(f"Claim too short: {assertion}")
            continue
        
        # 检查 evidence 深度
        evidence_desc = item.get("evidence", {}).get("description", "")
        if len(evidence_desc) < len(assertion) * 0.5:  # evidence 太浅
            log.warning(f"Evidence too shallow for: {assertion}")
        
        # 检查 source_lines 存在
        source_lines = item.get("source_lines", [])
        if not source_lines:
            log.warning(f"Missing source_lines for: {assertion}")
        
        claims.append(...)
    return claims
```

### 2. 改进 Card 生成

**目标文件**：`app/agent/card_generator.py`

**改进点**：

```python
# 1. 问题生成规则 - 从 topic 出发，不泄露 assertion
CARD_QUESTION_PROMPT = """
基于以下知识点的 topic（场景），生成一个测试问题。

**规则**：
- 问题只能使用 topic 中的信息
- 不能包含 assertion 中的关键技术词汇
- 引导学习者回忆"为什么"、"如何"、"什么情况下"

Topic: {topic}

生成问题（一句话）：
"""

# 2. Answer vs Explanation 分层
def generate_card_for_claim(claim: CoreClaim, router: LLMRouter) -> CardPayload:
    # Answer: 直接回答，简洁
    answer = _extract_answer_from_assertion(claim.assertion)
    
    # Explanation: 深层原理和上下文
    explanation = _generate_explanation(claim, router)
    # explanation 应该包含：
    # - 为什么这样做（原理）
    # - 反例或对比
    # - 典型场景
    
    return CardPayload(
        question=_generate_question(claim.topic, router),
        answer=answer,
        explanation=explanation,
        card_type=_determine_card_type(claim),
        claim_ref=claim.claim_id
    )

# 3. 卡片类型机械判断
def _determine_card_type(claim: CoreClaim) -> str:
    # 检查 evidence 中是否有对比词
    contrast_markers = ["但是", "然而", "而", "相比", "vs", "instead", "however"]
    has_contrast = any(m in claim.evidence.description for m in contrast_markers)
    if has_contrast:
        return "error_correction"
    
    # 检查 source_lines 是否包含代码块
    # （需要从 code_fence_ranges 检查）
    if _has_code_block(claim.source_lines):
        return "fill_in_blank"
    
    return "qa"
```

### 3. 增强 Hooks 解析

**目标文件**：`app/agent/hooks_resolver.py`

**改进点**：

```python
# 1. 扫描 index.json 中的已有笔记
def resolve_hooks(claims: list[CoreClaim], note_title: str) -> dict[str, list[str]]:
    """返回 {claim_id: [hook1, hook2]} 映射"""
    index_data = _load_index_json()
    existing_notes = index_data.get("notes", [])
    
    hooks_map = {}
    for claim in claims:
        hooks = []
        for note in existing_notes:
            if _is_related(claim, note, note_title):
                hooks.append(f"→ {note['title']} ({note['domain']})")
        
        if not hooks:
            # 记录 no_hook_reason
            log.debug(f"No hooks found for claim: {claim.topic}")
        
        hooks_map[claim.claim_id] = hooks
    
    return hooks_map

# 2. 关联度判断
def _is_related(claim: CoreClaim, note: dict, current_title: str) -> bool:
    # 避免自引用
    if note["title"] == current_title:
        return False
    
    # 基于关键词重叠（简单版）
    claim_keywords = _extract_keywords(claim.topic + " " + claim.assertion)
    note_keywords = _extract_keywords(note["title"])
    
    overlap = len(claim_keywords & note_keywords)
    return overlap >= 2  # 至少2个关键词重叠
```

### 4. 优化 Note 分区

**目标文件**：`app/agent/note_partitioner.py`

**改进点**：

```python
# 语义聚类而非简单按 heading 切分
def partition_notes(claims: list[CoreClaim]) -> list[NoteBundle]:
    """
    基于 claims 的语义相似度进行聚类。
    
    返回 1..N 个 notes（不是固定 1 个）
    """
    if not claims:
        return []
    
    # 简单策略：基于 domain 关键词分组
    # 例如："Vue"、"React" → 不同 notes
    #      "上传"、"下载" → 同一个 note（都是文件操作）
    
    clusters = _cluster_by_domain_keywords(claims)
    
    bundles = []
    for cluster_name, cluster_claims in clusters.items():
        bundle = NoteBundle(
            title=_generate_title_from_claims(cluster_claims),
            claims=cluster_claims,
            domain=_infer_domain(cluster_claims)
        )
        bundles.append(bundle)
    
    return bundles
```

### 5. 添加质量检查 Gates

**新文件**：`app/agent/quality_gates.py`

```python
class QualityGate:
    """质量检查门禁"""
    
    @staticmethod
    def check_claim_completeness(claim: CoreClaim) -> list[str]:
        """检查 claim 完整性"""
        issues = []
        
        # Gate 1: Assertion 长度
        if len(claim.assertion) < 20:
            issues.append("Assertion too short")
        
        # Gate 2: Evidence 深度
        if len(claim.evidence.description) < len(claim.assertion):
            issues.append("Evidence shallower than assertion")
        
        # Gate 3: Source lines 存在
        if not claim.source_lines:
            issues.append("Missing source_lines")
        
        return issues
    
    @staticmethod
    def check_card_quality(card: CardPayload, claim: CoreClaim) -> list[str]:
        """检查卡片质量"""
        issues = []
        
        # Gate 1: 问题不泄露答案关键词
        answer_keywords = set(_extract_keywords(claim.assertion))
        question_keywords = set(_extract_keywords(card.question))
        if len(answer_keywords & question_keywords) > 2:
            issues.append("Question leaks answer keywords")
        
        # Gate 2: Answer vs Explanation 不重复
        if card.answer in card.explanation:
            issues.append("Explanation repeats answer")
        
        # Gate 3: Explanation 有深度
        if len(card.explanation or "") < len(card.answer) * 1.5:
            issues.append("Explanation too shallow")
        
        return issues

# 在 orchestrator 中集成
def run(self) -> ProcessorResult:
    # ... 现有逻辑 ...
    
    # 质量检查
    for claim in all_claims:
        issues = QualityGate.check_claim_completeness(claim)
        if issues:
            log.warning(f"Claim quality issues: {issues}")
    
    for card in generated_cards:
        claim = _find_claim(card.claim_ref, all_claims)
        issues = QualityGate.check_card_quality(card, claim)
        if issues:
            log.warning(f"Card quality issues: {issues}")
    
    # ... 继续 ...
```

## 实施计划

### 阶段 1：Prompt 改进（1-2 天）

```
[ ] 1. 更新 claim_extractor prompt
[ ] 2. 更新 card_generator prompt
[ ] 3. 测试新 prompts 在 development.md 上的效果
[ ] 4. 调整 prompt 直到满足质量标准
```

### 阶段 2：验证逻辑（1 天）

```
[ ] 5. 实现 claim 完整性检查
[ ] 6. 实现 card 质量检查
[ ] 7. 添加 QualityGate 集成
```

### 阶段 3：Hooks 和分区（1 天）

```
[ ] 8. 实现 hooks 扫描 index.json
[ ] 9. 改进 note 分区逻辑
[ ] 10. 测试跨笔记关联
```

### 阶段 4：端到端测试（1 天）

```
[ ] 11. 测试 development.md 全流程
[ ] 12. 对比 ingest-json-auto 输出
[ ] 13. 调优直到质量达标
```

## 验收标准

### 与 Ingest Skill 输出对比

处理 `docs/raw/development.md`，生成的结果应该：

1. **Claim 质量**：
   - ✅ 每个 claim 可独立理解（无上下文依赖）
   - ✅ Evidence 包含代码块和完整上下文
   - ✅ Source lines 准确标注
   - ✅ Anti-patterns 基于实际扫描（不是空数组）

2. **Card 质量**：
   - ✅ 问题从 topic 生成，不泄露 assertion 关键词
   - ✅ Answer 简洁直接
   - ✅ Explanation 提供深层原理和对比
   - ✅ 卡片类型基于机械规则判断

3. **Note 结构**：
   - ✅ 生成 1..N 个 notes（基于主题聚类）
   - ✅ Hooks 正确关联相关笔记
   - ✅ 如果 hooks 为空，有 no_hook_reason

4. **整体质量**：
   - ✅ 通过所有 QualityGate 检查
   - ✅ 生成的笔记可以独立学习（不需要原文）
   - ✅ 2-4 周后复习能够重建理解

## 技术债务

### 当前简化

1. **语义相似度**：当前使用关键词重叠，未来可用 embeddings
2. **代码块检测**：需要在 orchestrator 中传递 code_fence_ranges
3. **Hooks 判断**：简单基于关键词，未来可用语义相似度

### 未来改进

1. 使用 embedding 模型进行语义聚类
2. 实现更复杂的 anti-pattern 扫描（基于模式而非关键词）
3. 添加迭代改进机制（根据用户反馈调整 prompts）

## 风险与缓解

| 风险                | 影响               | 缓解措施                        |
| ------------------- | ------------------ | ------------------------------- |
| Prompt 改进效果不佳 | 生成质量无提升     | 多轮测试调优，保留 A/B 测试版本 |
| LLM 输出不稳定      | 偶尔生成低质量内容 | 添加 quality gates 拦截         |
| 处理时间增加        | 用户等待更久       | 优化 prompt 长度，批量处理      |
| Token 成本上升      | 运营成本增加       | 监控用量，优化采样大小          |

## 依赖

### 前置条件
- **Proposal 1 已完成**：agent 已启用，API 已配置

### 外部依赖
- DashScope API（中文）
- OpenAI API（英文，可选）

## 估计工作量

- **Prompt 改进**：8-16 小时（包括测试调优）
- **验证逻辑**：4-6 小时
- **Hooks 和分区**：4-6 小时
- **质量检查**：2-4 小时
- **测试调优**：4-8 小时
- **总计**：22-40 小时（3-5 天）

## 优先级

**MEDIUM** - 在 Proposal 1 完成后实施。agent 已经可用，本 proposal 是质量增强而非功能性修复。

## 成功指标

1. **客观指标**：
   - Claim 平均长度 > 50 字符
   - Evidence 长度 > Assertion 长度
   - 90% 的 claims 有 source_lines
   - 90% 的 cards 通过 quality gates

2. **主观指标**：
   - 开发者盲测：Agent 输出 vs Ingest Skill 输出难以区分
   - 用户复习体验：能够从卡片重建理解

## 后续工作

完成后可以考虑：

1. **监控和迭代**：
   - 收集用户复习数据
   - 分析哪些卡片被标记为"困难"
   - 持续优化 prompts

2. **多语言支持**：
   - 支持更多语言（日语、韩语等）
   - 优化不同语言的 prompt

3. **个性化**：
   - 根据用户水平调整卡片难度
   - 允许用户自定义 prompt 偏好
