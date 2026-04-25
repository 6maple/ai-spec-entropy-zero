# Entropy Reduction Rules

## Scope

Convert one raw markdown file into `1..N` note objects.

## Inputs

- One source file in `docs/raw/*.md`

## Outputs

- One or more note JSON objects for `docs/notes/*.json`

Each note must include at minimum:

- `id`
- `title`
- `source.input_path`
- `source.line_range`
- `content.core_claims`
- `content.refinement.anti_patterns`
- `content.hooks`
- `content.hooks_meta` (required when hooks is empty)

## Procedure

### Step 0 — Run Source Parser Script

**Run from project root:**

```powershell
python scripts/ingest/parse_source.py docs/raw/<filename>.md
```

The script outputs structural metadata only (no line content). Store in working memory as `parse`:

```
parse = <JSON output from script>
```

| Field in `parse`          | Content                                                         | How to use                                         |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `parse.total_lines`       | total line count                                                | upper bound for `line_end`                         |
| `parse.section_ranges`    | `[{heading, level, line_start, line_end}]` (1-based, inclusive) | use for `source.line_range` and section boundaries |
| `parse.code_fence_ranges` | `[{lang, line_start, line_end}]` (1-based, inclusive)           | check if a line is inside a code block             |

**Derived lookups (no re-read needed):**

| Need                                       | Expression                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `source.line_range` for a note             | `[section.line_start, section.line_end]`                                                          |
| Section contains code block?               | any fence where `fence.line_start >= section.line_start` and `fence.line_end <= section.line_end` |
| Claim's `source_lines` overlap code fence? | any fence where `fence.line_start <= source_line <= fence.line_end`                               |

**Section and line content is fetched on demand via `get_section.py` in Step 4. Anti-pattern lines are fetched via `scan_antipatterns.py` in Step 5.**

---

1. Use `section_ranges` to identify sections. Use `line_map` to read content.

2. Extract atomic concepts per section.

3. **Decide note partitioning.**

   Count distinct primary concepts in the source. A primary concept is a named technique, mechanism, API, pattern, or principle that can stand alone and answer its own "what is X / how does X work?" question.

   Decision criteria — use the first matching rule:

   | Signal                                                                                                              | Decision                                                            |
   | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
   | All sections are facets of one central subject (definition, triggers, use cases, pitfalls all about the same thing) | **1 note**                                                          |
   | Each section has its own heading that names a different subject                                                     | **N notes**, one per subject cluster                                |
   | Source mixes 3+ unrelated topics (e.g., css.md covers BFC, box model, and responsive layout)                        | **N notes**, split by topic cluster regardless of heading structure |
   | Concepts share a common prerequisite but each has independent utility                                               | **N notes** with hooks linking them                                 |

   Do NOT default to 1 note just because the source is one file. One raw file frequently yields 3–8 notes.

4. **For each section (one at a time), fetch content and generate `content.core_claims`:**

   **Fetch section content before processing it:**

   ```powershell
   python scripts/ingest/get_section.py docs/raw/<filename>.md --heading "<section_heading>"
   ```

   Output fields:
   - `annotated`: section content with each line prefixed `[N]` — use line numbers from here for `source_lines`
   - `code_fences`: fences within this section — use to determine if the section has code blocks
   - `line_start` / `line_end`: for `source.line_range`

   Process one section at a time. Do not fetch all sections upfront.
   - **Synthesis rule — rewrite, do not transcribe:** Claims and evidence must be written in clear, learner-ready language synthesized from the source. Do NOT copy-paste sentences from the source verbatim. Source text is written for readers who already have context — it is often unstructured, redundant, or imprecise. Your job is to distill and rewrite:
     - Remove filler, redundant qualifiers, and parenthetical asides that add no information
     - Impose a clear subject → behavior → condition structure (see Claim completeness rule)
     - Resolve vague pronoun references (“它”, “this”) to the actual named concept
     - Write as a teacher explaining to a student, not as a transcriptionist

     **❌ Wrong — verbatim source copy, structure intact from source:**
     `"利用浏览器对不同域名的并发下载特性，将第三方库和静态图片托管至 CDN，利用距离最近节点加速响应，并利用浏览器对不同域名的并发下载特性。"`

     **✅ Correct — synthesized and restructured for clarity:**
     `"将静态资源托管至 CDN 可从两个棁杆加速首屏：±1. 就近节点缩短网络距离（降低 TTFB）；2. 跨域浏览器并发限制不占用主域名额度。适用对象：第三方库、字体、大尺寸图片。"`

   - **Claim completeness rule — three required components:** A claim is NOT a summary label. It must be self-sufficient: a reader who has never seen the source must be able to reconstruct the full knowledge point from the claim text alone. Every complete claim contains:
     1. **Subject** — the entity being described (API, mechanism, pattern, property)
     2. **Behavior or mechanism** — what it does, how it works, or why it behaves that way. NOT just "用于 X" or "is used for X"
     3. **Condition or context** — when it applies, what triggers it, or what prerequisite exists (include concrete numbers, thresholds, or constraints from the source)

     If the source provides numbers, thresholds, or concrete conditions, they belong in the claim — do not leave them only in `evidence.description`.

     **❌ Too thin — label only, no mechanism or condition:**
     `"IntersectionObserver 用于检测元素可见性。"`

     **✅ Complete — all three components present:**
     `"当需要检测列表项是否进入视口时，\`IntersectionObserver\` 是推荐方案：它通过异步回调而非 scroll 事件触发，不阻塞主线程；默认阈值 0 表示有 1px 进入视口即触发，可通过 \`threshold\` 选项调整。"`

   - Each claim includes evidence and `source_lines`. Record `source_lines` as the `[N]` numbers from the `annotated` output that the claim draws from.
   - **Code-block claims:** If `code_fences` is non-empty, `evidence.description` MUST contain the actual fenced code block from the source plus the adjacent prose that explains it. Combine them into one markdown string in reading order (prose intro → code block → prose continuation). Do NOT write a summary sentence in place of the code.

   **❌ Wrong — code replaced with a summary:**

   ```json
   {
     "claim": "使用 IntersectionObserver 可以异步检测元素可见性，无需监听滚动事件。",
     "evidence": {
       "description": "该 section 给出了 IntersectionObserver 示例并说明其异步检测优势。"
     },
     "source_lines": [123, 137]
   }
   ```

   **✅ Correct — prose + code block both preserved:**

   ````json
   {
     "claim": "当需要检测元素是否进入视口时，`IntersectionObserver` 是现代推荐方案：异步回调、无需监听 scroll 事件、性能高。",
     "evidence": {
       "description": "Intersection Observer API 通过异步回调检测可见性，无需绑定滚动事件：\n\n```javascript\nconst observer = new IntersectionObserver((entries) => {\n  entries.forEach(entry => {\n    if (entry.isIntersecting) {\n      console.log('元素进入视口');\n    }\n  });\n});\nobserver.observe(targetElement);\n```\n\n默认阈值为 0（有 1px 进入视口即触发），可通过 `threshold` 选项调整触发比例。"
     },
     "source_lines": [123, 124, 125, 126, 127, 128, 129, 130, 131, 137]
   }
   ````

   - **Prose-only evidence completeness:** When `code_fences` is empty, `evidence.description` must still be complete enough that a learner can understand the claim without consulting the source. Do NOT write a one-sentence summary. Include all of:
     - The mechanism or principle explaining **why** the claim is true
     - Concrete numbers, thresholds, or conditions cited in the source
     - Contrast with the common wrong approach, if the source mentions one

     **❌ Too thin — one-sentence summary:**
     `"BFC 是一种块格式化上下文，可以用来解决浮动问题。"`

     **✅ Complete — mechanism + triggers + concrete use cases:**
     `"BFC（块格式化上下文）是页面上的一块独立渲染区域，其内部布局不影响外部元素。触发方式：浮动元素、\`position: absolute/fixed\`、\`display: inline-block\`、\`overflow\` 非 \`visible\`。利用 BFC 可解决三类问题：父容器高度塌陷（内部浮动）、兄弟元素外边距折叠、浮动元素与文本流叠压。"`

   - **Scene-aware claim wording:** Prefer writing the claim text in a way that includes usage context or triggering conditions (e.g., "当 [场景] 时，X 的行为是..." or "In [context], X works by...") rather than bare definitions ("X 是..."). Claims with embedded context activate more associative recall paths than isolated definitions.
   - **Knowledge shape — apply the Partitioning Test before writing claims:** Read [output-schemas.md Markdown Structure Standard](../references/output-schemas.md) for the full definition of Shape A (mechanistic) vs Shape B (enumeration). Apply the partitioning test: "Can each item be independently learned and tested?" If YES → one Shape A claim per item. If NO (the set is the knowledge) → one Shape B enumeration claim for the whole set. Never group independently applicable techniques into one enumeration claim.
   - **Markdown text:** All string fields in `core_claims` (`claim`, `evidence.description`) are markdown strings. Use inline backticks for identifiers, property names, and short code snippets. Use fenced code blocks (` ``` `) for multi-line code. Do not strip markdown formatting. `claim` text must be prose only — no bullet lists. If a list is needed to express the claim, apply the partitioning test and split.

5. **Generate `content.refinement.anti_patterns` — run scanner script:**

   ```powershell
   python scripts/ingest/scan_antipatterns.py docs/raw/<filename>.md
   ```

   The script returns all lines containing signal words with \u00b11 context lines, annotated with line numbers. Read the output and:

   a. For each distinct mistake found in `matches`, extract it as one `anti_patterns` string. The string is a markdown string — use inline backticks for API names or short code snippets that illustrate the mistake.
   b. Also infer anti_patterns from contrast: if a claim states the correct approach and the matched context implies a common alternative is wrong, extract that alternative as an anti_pattern.
   c. Only leave `anti_patterns` empty if `total_matches` is 0 and step (b) yields nothing.

6. **Set `content.hooks` to placeholder.**

   At this stage, set `hooks: []` and do NOT attempt to scan other notes yet. All note content must be finalized and written to disk before hooks can be determined accurately. Hooks are populated in a dedicated **Hooks Pass** (see below) after all files are written.

7. **Note-level review — apply before finalizing the note.**

   After all claims for a note are drafted, read the full `core_claims` array once as a set and ask:

   > "If I handed these claims and their evidence to someone who studied this topic 3 weeks ago and now remembers nothing — would they be able to reconstruct complete understanding of every key concept in the source section?"

   Check specifically:
   - **Coverage:** Is any important mechanism, condition, or consequence from the source section missing from the claims entirely? If yes, add a claim.
   - **Depth:** Are any claims still label-only (subject present but mechanism/condition absent)? If yes, rewrite per Claim completeness rule.
   - **Granularity:** Are independently applicable techniques still grouped in one claim? If yes, split per Partitioning Test.
   - **Clarity:** Does any claim or evidence sentence require the source for context (pronouns without referents, unexplained abbreviations, jargon not defined anywhere in the note)? If yes, rewrite.

   Only proceed to Step 5 after this check passes for all claims in the note.

---

## Hooks Pass (run after all note and card files are written)

This pass runs once per ingest run, after all `docs/notes/*.json` and `docs/note-cards/*.json` files for this run are written to disk and `docs/index.json` has been updated.

**Why deferred:** hooks can reference notes produced in the same run (cross-note relationships). Running hooks during note generation would miss those relationships and would evaluate hooks against incomplete content.

### Procedure

1. Read the updated `docs/index.json` (now includes this run's notes).
2. For each note produced in this run:
   a. Filter index entries by domain (same or related domain first).
   b. For candidate notes with related titles, read their full JSON file and compare `content.core_claims`.
   c. Notes produced in this same run are also valid candidates — read them.
   d. Do not read non-candidate files.
   e. Apply Hook Generation rules below.
   f. Only leave `hooks` empty if no high-confidence relationships exist after scanning.
   g. If `hooks` is empty, set `content.hooks_meta.no_hook_reason`.
3. For each note produced in this run, generate the hooks array. Then run:

   ```powershell
   # PowerShell — pipe hooks JSON array to the script:
   '<hooks_json_array>' | python scripts/ingest/update_note_hooks.py docs/notes/<slug>.json

   # Empty hooks example:
   '{"hooks":[],"no_hook_reason":"no related notes found"}' | python scripts/ingest/update_note_hooks.py docs/notes/<slug>.json
   ```

   The script patches only `content.hooks` and `content.hooks_meta`; all other fields remain unchanged. Repeat for each note produced in this run.

   **`hooks_json_array` format:**

   ```json
   [
     {
       "type": "supplement|contradiction|extension|prerequisite|analogy|causation",
       "target_note_id": "note_xxx",
       "claim_ref": "note_id:claim_index",
       "description": "one-sentence rationale"
     }
   ]
   ```

   If hooks is empty, use object form:

   ```json
   { "hooks": [], "no_hook_reason": "reason string" }
   ```

### Hook Generation

Hooks record high-confidence relationships between this note and **existing** notes in `docs/notes/`.

**Step 1 — Scan.** After claims are finalized, read existing note files and compare their `content.core_claims` against this note's claims and topic domain.

**Step 2 — Classify.** Only create a hook when the relationship is directly inferable from claim text or domain. Use exactly one type per hook:

| Type            | Use when                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `supplement`    | The other note covers the same concept at a different depth or from a different angle                               |
| `contradiction` | A claim in this note directly conflicts with a claim in the other note (both cannot be true under the same context) |
| `extension`     | This note builds on or continues concepts from the other note; the other note should be read first                  |
| `prerequisite`  | Understanding the other note is required to understand a key claim in this note                                     |
| `analogy`       | A concept in this note structurally parallels a concept in the other note across different domains                  |
| `causation`     | A concept in the other note is the mechanism or cause of something described in this note                           |

When uncertain between two types, prefer `supplement`. When uncertain whether a hook exists at all, prefer no hook.

**Step 3 — Write.** Each hook object must include:

```json
{
  "type": "supplement|contradiction|extension|prerequisite|analogy|causation",
  "target_note_id": "note_xxx",
  "claim_ref": "note_id:claim_index",
  "description": "one-sentence rationale for this relationship"
}
```

- `claim_ref` is optional; include it when the relationship is between specific claims rather than whole notes.
- `description` must state why the relationship holds, not just restate the type name.

**Step 4 — Consume contradiction hooks.** If a hook of type `contradiction` is generated, this automatically triggers the conflict gate. Do not suppress or defer — run [Conflict Policy](./conflict-policy.md) before saving outputs.

**Step 5 — Write hooks_meta when empty.** If no hooks are generated, set:

```json
"hooks_meta": {
  "no_hook_reason": "brief explanation, e.g., no related notes exist yet, or domain is isolated"
}
```

- Keep claim evidence tied to source lines.

## Data Rules

- Do not set fixed target counts.
- Do not add parent note abstraction.
- Keep all claims source-traceable.

## Coverage Rule

For each high-information section, map at least one `core_claim`.
If mapping fails, retry section deconstruction once before finalizing.

## Failure Output Contract

When coverage still fails after one retry, stop and report:

- `failed_stage`: `entropy-reduction`
- `reason`: concise sentence
- `missing_sections`: list of section titles or line ranges
- `next_action`: `manual-review-required`
