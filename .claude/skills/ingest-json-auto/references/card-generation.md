# Card Generation Rules

## Scope

Generate review cards from note `core_claims` only.

## Invariant

Strict 1:1 mapping:

- one `core_claim` -> one primary card
- no missing card
- no duplicated claim card
- no optional extra card

## Procedure

**Initialize claim counter before iterating:**

```
claim_index = 0   ← reset to 0 for each note; increment by 1 after each claim
```

This counter drives `card_id` (`card_<claim_index>`) and `claim_ref` (`note_id:<claim_index>`). Never derive these from any other source.

1. Iterate claims in order.
2. For each claim, create one card with `claim_ref` (`note_id:claim_index`). Increment `claim_index` by 1.
3. **Assign card type — mechanical check, in order:**

   **Step 3a — Check for `error_correction`.**
   Scan the claim text for contrast language markers:
   - Chinese: `而不是`、`不应该`、`不能`、`应避免`、`禁止`、`错误做法是`、`不推荐`
   - English: `instead of`, `not X but`, `should not`, `avoid`, `never`, `wrong approach`

   If any marker is present **in the claim itself** (not in `anti_patterns`), assign `error_correction`.

   **Step 3b — Check for `fill_in_blank`.**
   Only if step 3a did not trigger. Check if the claim's `evidence.description` contains a fenced code block AND any of the claim's `source_lines` fall within a code fence range in `parse.code_fence_ranges`:

   ```
   overlaps = any fence where fence.line_start <= source_line <= fence.line_end
              for any source_line in claim.source_lines
   ```

   If `overlaps` is true AND the key answer content is a specific syntax, property name, or code pattern that must be reproduced exactly → assign `fill_in_blank`.

   **Step 3c — Default.**
   If neither 3a nor 3b triggered, assign `qa`.

4. For each claim, generate card fields by following these sub-steps in order:

   **4a. Decompose the claim.**
   Split the claim into two parts before writing any field:
   - `topic`: the entity or concept being described (e.g. "BFC", "Promise.all", "虚拟滚动"). Usually the grammatical subject.
   - `assertion`: what is stated about the topic — the property, behavior, condition, list of items, or mechanism. Everything after the subject.

   **4b. Write `question` — using `topic` only, not `assertion`.**
   Use the `topic` name and the claim type (see Question Strategy table) to form the question.
   Do NOT consult `assertion` when writing the question.
   The question must name the knowledge gap (category word: 特性、条件、原因、方式、区别、机制…) without revealing the content.

   **4c. Run Keyword Exclusion Check.**
   Extract the key nouns and verbs from `assertion`.
   If any of them appear in `question` (beyond the topic name itself), rewrite `question` until they do not.
   This check is mechanical — do not rely on judgment.

   **4d. Write `answer`.**

   The `answer` is NOT a copy of the claim sentence. It is the learner's complete study material for this card. Write it so that a learner who has never seen the source can fully understand the knowledge point after reading the answer.

   **Required content — `answer` must include both:**
   1. The core assertion from the claim (the declarative statement of the fact)
   2. The supporting content from `evidence.description`: mechanism, triggering condition, concrete data, or code — whichever makes the answer self-explanatory

   The claim sentence alone is almost never sufficient. If the claim states "X does Y in condition Z" and the evidence explains the mechanism — both must appear in the answer.

   **Self-test:** After writing `answer`, ask: "Could a learner who has never seen the source reconstruct full understanding from this answer?" If not, add the missing mechanism or context from `evidence.description`.

   **❌ Wrong — claim sentence only, evidence discarded:**

   ```json
   {
     "answer": "当需要检测列表项是否进入视口时，IntersectionObserver 是推荐方案。"
   }
   ```

   **✅ Correct — claim + mechanism + code from evidence all present:**

   ````json
   {
     "answer": "当需要检测列表项是否进入视口时，`IntersectionObserver` 是推荐方案：它通过异步回调而非 scroll 事件触发，不阻塞主线程；默认阈值 0 表示有 1px 进入视口即触发。\n\nIntersection Observer API 通过异步回调检测可见性：\n\n```javascript\nconst observer = new IntersectionObserver((entries) => {\n  entries.forEach(entry => {\n    if (entry.isIntersecting) {\n      console.log('元素进入视口');\n    }\n  });\n});\nobserver.observe(targetElement);\n```\n\n可通过 `threshold` 选项调整触发比例（如 0.5 表示元素 50% 进入时触发）。"
   }
   ````

   **Code anchor rule:** If `evidence.description` contains a fenced code block (` ``` `), the `answer` MUST include both the code block AND the key explanatory prose from `evidence.description`. Do not copy only the claim sentence — copy the full evidence content.

   **Markdown format:** `answer` is a markdown string. Use inline backticks for identifiers, fenced code blocks for multi-line code. Do not strip markdown.

   **4e. Write `explanation`.**

   The explanation deepens the answer — it is NOT a restatement of it. It must contain two distinct components:
   1. **Mechanism** — _why_ the answer is correct: the underlying principle, constraint, or design decision that makes X behave this way
   2. **Consequence** — _what happens_ if you ignore this / choose the wrong approach; or _what concrete benefit_ the correct approach provides

   **Required framing:** "在 [实际场景] 中，[机制]，因此 [结论/后果]。" An explanation that only restates what the answer already says is invalid.

   **❌ Too thin — restates the answer:**
   `"IntersectionObserver 通过异步回调检测可见性，无需监听 scroll 事件。"`

   **✅ Complete — mechanism + consequence chain:**
   `"传统方案在 scroll 事件回调中调用 getBoundingClientRect()，该方法强制同步布局（layout thrashing），每次滚动都会阻塞主线程。IntersectionObserver 的观察是异步的，浏览器在空闲时批量推送可见性变化，不与渲染帧竞争，因此在长列表中可以实现 0 丢帧的懒加载。"`

   **Markdown format:** `explanation` is a markdown string. May use inline backticks or brief code expressions where helpful.

   **4f. Write remaining fields:** `card_id`, `claim_ref`, `type`, `source_lines`.

   **4g. Pre-output self-test (mandatory before finalizing the card).**
   Simulate the learner perspective defined in SKILL.md:

   > “If this person studied this topic 3 weeks ago and now remembers nothing, can they reconstruct full, correct understanding from this card alone?”

   If the answer is no:
   - `question` exposes the answer → rewrite using topic only (step 4b)
   - `answer` is missing mechanism, condition, or code → add from `evidence.description`
   - `explanation` restates `answer` → add mechanism chain + consequence (step 4e)
   - Any field contains source text copied verbatim that is unclear without context → rewrite in learner-ready language

   Only proceed to write the card after this check passes.

Primary card required shape:

- `card_id`: stable and unique within file
- `claim_ref`: `note_id:claim_index`
- `type`: `qa` | `fill_in_blank` | `error_correction`
- `question`: must test recall without exposing the answer — see Question Rules below. **Markdown string** — may include a fenced code block as stem for `fill_in_blank` cards.
- `answer`: claim core assertion **plus** the supporting content from `evidence.description` (mechanism, data, or code). Must be self-sufficient — a learner who has never seen the source should fully understand the knowledge point after reading the answer. **Markdown string** — if `evidence.description` contains a fenced code block, the answer MUST reproduce that code block.
- `explanation`: why the answer is correct, referencing the mechanism or rationale from source — not a restatement of the answer. **Markdown string.**
- `source_lines`: one or more valid line numbers

## Question Rules

### Hard Rule: Question Must Not Expose Assertion

The question is written from `topic` only. It must not contain content words from `assertion`.

Mechanical check: extract key nouns/verbs from `assertion` → verify none appear in `question` beyond the topic name. If they do, rewrite.

⚠️ Do not use subjective judgment ("could the user guess the answer?"). Use the keyword check — it is unambiguous.

### Question Strategy by Claim Type

| Claim type             | Question pattern                                                                  |
| ---------------------- | --------------------------------------------------------------------------------- |
| Definition / property  | "What is X?" or "What property does X have?" — omit the defining phrase entirely  |
| Enumeration            | "List the ways/conditions/triggers for X" — do not name the items in the question |
| Application / use case | "How would you solve [problem]?" or "When should you use X?"                      |
| Causation / mechanism  | "Why does X cause Y?" or "What happens when [condition]?"                         |
| Anti-pattern / error   | "What is wrong with [incorrect approach]?"                                        |
| Contrast / comparison  | "How does X differ from Y?"                                                       |

### Guidance

- Use the minimum words needed to unambiguously identify the knowledge gap.
- Prefer "how" and "why" over "what is" when the claim describes behavior or causation.
- For `fill_in_blank`: the `question` MUST provide the surrounding code structure as stem — blank out only the key term, value, or syntax the learner must recall. Do NOT ask a fill-in-blank question without code context. The code frame is what triggers recall; the blank tests precision.
  Example stem: "以下代码中，`___` 处应填入什么使组件缓存生效？\n`vue\n<___ :include=\'['Home']\'><router-view/></___ >\n`"
- For `error_correction`: present a plausible but wrong approach; ask what is wrong or what the correct approach is.
- **Scenario-first rule for code claims:** When a claim's `evidence.type` is `code_example`, prefer questions that describe a problem scenario and ask the learner to recall the solution (e.g., "遇到 [问题]，应该用什么方式实现？"), rather than asking about the API name directly (e.g., "X API 的作用是什么？"). Scenario questions activate real-world recall paths; API lookup questions do not.

### Contrast Examples (Bad → Good)

These show the most common failure mode — embedding the answer into the question — and the correct rewrite:

| Claim                                                                | ❌ Bad question                                            | ✅ Good question                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| BFC 是一个独立的布局容器，其内部布局不影响外部，外部元素也不影响内部 | 为什么 BFC 是一个独立的布局容器，其内部布局不影响外部？    | BFC 的布局隔离特性是什么？                                   |
| BFC 可以由浮动、定位、inline-block、overflow 非 visible 或根元素触发 | 为什么 BFC 可以由浮动、定位、overflow 非 visible 触发？    | 列举至少三种能触发 BFC 的 CSS 属性或元素类型                 |
| 利用 BFC 可以防止外边距重叠、清除内部浮动并解决高度塌陷问题          | 为什么利用 BFC 可以防止外边距重叠和高度塌陷？              | 高度塌陷和外边距重叠这两类布局问题，可以用什么统一手段解决？ |
| 虚拟滚动只渲染可视区域内的列表项，而不是全量 DOM                     | 为什么虚拟滚动只渲染可视区域内的列表项？                   | 长列表性能优化中，虚拟滚动的核心策略是什么？                 |
| Promise.all 中任意一个 rejected 时整体立即 reject                    | 为什么 Promise.all 中任意一个 rejected 时整体立即 reject？ | Promise.all 在其中一个 Promise 失败时，整体行为是什么？      |

**Pattern to avoid:** Prepending "为什么" / "why" / "what is it that" to the claim text. This always embeds the answer.

## Determinism Rules

- Card count must equal claim count.
- `claim_ref` must be unique within a note card set.
- Every card must be directly traceable to claim source lines.

## Card ID Recommendation

Use deterministic IDs to reduce churn on re-ingest:

- `card_<claim_index>_<yyyymmdd>` or
- `card_<short-note-id>_<claim_index>`

## Failure Output Contract

When mapping integrity fails after one retry, stop and report:

- `failed_stage`: `card-generation`
- `reason`: concise sentence
- `unmapped_claim_refs`: list
- `duplicate_claim_refs`: list
- `next_action`: `manual-review-required`
