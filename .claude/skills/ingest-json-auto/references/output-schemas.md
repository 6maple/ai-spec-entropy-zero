# Output Schemas

This file defines minimal output structures for deterministic implementation.

## Markdown Text Fields

The following string fields in all output files are **markdown strings** and will be rendered as markdown in the UI:

| Field                                | Location | Notes                                                                |
| ------------------------------------ | -------- | -------------------------------------------------------------------- |
| `core_claims[].claim`                | note     | may use inline backticks for identifiers                             |
| `core_claims[].evidence.description` | note     | fenced code block + prose when source has code; prose only otherwise |
| `refinement.anti_patterns[]`         | note     | may use inline backticks for API names / short code                  |
| `hooks[].description`                | note     | may use inline backticks                                             |
| `cards[].question`                   | card     | may include code fence for fill_in_blank stem                        |
| `cards[].answer`                     | card     | must include fenced code block when `evidence.type = code_example`   |
| `cards[].explanation`                | card     | may use inline backticks or brief code blocks                        |

**Rule:** Never strip markdown syntax from these fields. Write them so that a markdown renderer produces the intended reading experience — code highlighted, prose readable.

---

## Language Policy

**Rule:** All generated text must use the same language as the source document. Do not mix languages within a field.

### Detection

Before generating any output, determine the source language from the raw file content:

- If the source contains predominantly Chinese (CJK) characters in its prose → **source language is Chinese**
- If the source is predominantly English prose → **source language is English**
- Mixed sources: use the language of the majority of prose sentences (not headings or code)

Store this as `source_lang` and apply it consistently to all output fields for this run.

### Application by Field

| Field                                            | Rule                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `claim`                                          | Source language only                                                                                              |
| `evidence.description` (prose portions)          | Source language only                                                                                              |
| `anti_patterns[]`                                | Source language only                                                                                              |
| `hooks[].description`                            | Source language only                                                                                              |
| `question`                                       | Source language only — **this is the most commonly violated field**                                               |
| `answer` (prose portions)                        | Source language only                                                                                              |
| `explanation`                                    | Source language only                                                                                              |
| Technical identifiers, API names, CSS properties | Always in their natural technical form (e.g., `IntersectionObserver`, `box-sizing`) regardless of source language |
| Code blocks                                      | Always in the programming language of the source code — never translated                                          |

### Common Violation

The most frequent mistake: source is Chinese, but `question` is written in English because the skill examples use English question patterns.

**❌ Wrong — question in English, source is Chinese:**

```json
{ "question": "What is the role of `box-sizing` in CSS layout?" }
```

**✅ Correct — question in Chinese, matching source language:**

```json
{ "question": "`box-sizing` 如何影响 CSS 元素的宽度计算方式？" }
```

---

## JSON String Escaping Rules

These rules govern backslash usage inside JSON string values. Applying them incorrectly is a silent failure — the JSON remains valid but renders wrong.

### The Single Decision Rule

Before writing or reviewing any backslash sequence in a JSON string, ask one question:

> **"Should this render as a visible character, or as whitespace/structure?"**

- **Render as whitespace/structure** (newline, tab) → use the JSON escape sequence: `\n`, `\t`
- **Render as a visible backslash** → use `\\` (two backslashes)
- **Render the literal two-character text `\n`** → use `` `\n` `` with backtick wrapping in markdown, so no raw backslash-n appears in the string at all

### Escaping Reference Table

| Intent                               | Correct JSON                  | Rendered output                    | Notes                                     |
| ------------------------------------ | ----------------------------- | ---------------------------------- | ----------------------------------------- |
| Paragraph break between prose blocks | `\n\n`                        | blank line between paragraphs      | Standard markdown paragraph separator     |
| New line within a code block         | `\n`                          | line break inside the code block   | Code block newlines use the same `\n`     |
| Display a literal backslash          | `\\`                          | `\`                                |                                           |
| Display the text `\n` in prose       | `` `\n` `` (backtick-wrapped) | `` `\n` `` rendered as inline code | Do NOT use `\\n` in prose — use backticks |
| Tab character                        | `\t`                          | tab                                | Rare in markdown fields                   |

### The False-Fix Anti-Pattern

**Never change `\n` to `\\n` during review.** This is the most common escaping mistake.

`\n` is a complete, valid JSON escape sequence meaning "newline character." It does not need further escaping. Changing it to `\\n` produces a literal backslash-n in the rendered output — breaking all paragraph spacing and code block structure.

```
// JSON in file — CORRECT, do not touch:
"description": "第一段解释机制。\n\n第二段描述后果。"

// Rendered as:
// 第一段解释机制。
//
// 第二段描述后果。
```

```
// After false-fix — WRONG:
"description": "第一段解释机制。\\n\\n第二段描述后果。"

// Rendered as (broken):
// 第一段解释机制。\n\n第二段描述后果。   ← literal \n\n visible in text
```

### When `\\n` Actually Appears in This Codebase

`\\n` (double backslash) is correct only when the markdown text itself should display the escape sequence as visible text — for example, explaining that `\n` is a newline escape. But in this codebase, such content is almost always better written using inline backtick syntax:

```
// Preferred — backtick wrapping, no escaping issue:
"explanation": "在 JavaScript 中，`\\n` 表示换行符。"

// This renders as: 在 JavaScript 中，`\n` 表示换行符。
```

Note: inside backtick-wrapped inline code in a JSON string, `\\n` renders as `\n` — which is the intended display. This is the only common legitimate use of `\\n` in this codebase.

### Review Protocol

When reviewing or editing any JSON string field in this codebase:

1. **Do NOT change `\n` to `\\n`** unless you have verified the intent is to display a literal backslash-n in the rendered text.
2. **Do NOT change `\\n` to `\n`** unless you have verified the content is not trying to display a literal escape sequence.
3. When in doubt: read the surrounding prose and ask "what should the learner see at this point?" — then pick the sequence that produces that output.

---

## Markdown Structure Standard

This standard governs how all markdown text fields must be structured. It operates at a level above formatting — it defines what constitutes a **learnable unit** and how to represent different knowledge shapes so that learners can recall and verify individual facts.

### Two Knowledge Shapes

Every claim and its corresponding answer fits one of two shapes. Identify the shape first, then apply the matching template.

#### Shape A — Mechanistic (one technique / one mechanism)

A single technique, API behavior, algorithm, or cause-effect relationship.

**Claim text rule:** One to two prose sentences. No bullet lists. Inline `` `code` `` for identifiers.

**Template for `evidence.description` and `answer`:**

```
[First paragraph: mechanism — how it works or why it works this way. Include concrete numbers or thresholds from source.]

[Second paragraph (optional): consequence or contrast — what happens without it, or how it differs from the naive approach.]
```

No bullet lists. No category headers. Pure prose in reading order.

#### Shape B — Enumeration (a set of parallel items that must be recalled together)

Used only when the central learning objective IS the complete set — for example: all CSS properties that trigger a layout context, all failure modes of a pattern, all required steps in a protocol handshake.

**Key distinction from Shape A:** If each item is an independent technique that can be learned and applied separately → it is NOT an enumeration claim. It is N separate Shape A claims. Use enumeration only when the items are members of a defined set and must be recalled as a group.

**Claim text rule:** One prose sentence naming the set and count. No list in the claim itself.

**Template for `evidence.description` and `answer`:**

```
[Claim sentence restated or minimally expanded]

- **Term 1**: one sentence explaining what this item does or when it applies.
- **Term 2**: one sentence explaining what this item does or when it applies.
- **Term 3**: one sentence explaining what this item does or when it applies.
```

Rules for enumeration content:

- Each item: `**Bold label**` + colon + one self-contained sentence. Do NOT start the sentence with "它" or "这" — name the concept directly.
- No nested bullets. One level only.
- No introductory category line before the list (the claim sentence already names the category).
- 2–6 items. If more exist, verify the claim is not over-broad.
- Numbered lists only when item order is semantically meaningful (steps in a process). Use bullets otherwise.

### The Partitioning Test

Before writing claims, apply this test to each group of techniques or concepts in a source section:

> **"Can each item be independently learned and tested?"**
>
> - If YES → each item is a separate Shape A claim → one claim per technique, one card per claim.
> - If NO (the set is the knowledge) → one Shape B enumeration claim → one card for the whole set.

**Example — WRONG: two independent techniques crammed into one enumeration claim:**

```json
{
  "claim": "首屏传输可通过两类技术加速：CDN 分发和 HTTP/2 升级。",
  "evidence": {
    "description": "传输与响应速度（加速）：\n\n- CDN 内容分发：将第三方库和静态图片托管至 CDN，利用最近节点加速响应。\n- HTTP/2 协议升级：启用多路复用，解决 HTTP/1.1 头部阻塞。"
  }
}
```

CDN and HTTP/2 are independently applicable — they should be two separate claims.

**Example — CORRECT: split into two Shape A claims:**

```json
{ "claim": "将第三方库和静态资源托管至 CDN，可利用最近节点缩短 TTFB，并借助浏览器对不同域名的并发限制实现并行下载。" },
{ "claim": "升级至 HTTP/2 可启用多路复用，根本性解决 HTTP/1.1 的队头阻塞问题，使同域资源真正并行传输，无需域名分片。" }
```

**Example — CORRECT enumeration (the set IS the knowledge):**

```json
{
  "claim": "BFC 可由以下四类 CSS 条件触发：浮动、绝对/固定定位、inline-block，以及 overflow 非 visible。",
  "evidence": {
    "description": "BFC（块格式化上下文）的触发条件：\n\n- **浮动元素**：`float` 为 `left` 或 `right`。\n- **绝对/固定定位**：`position: absolute` 或 `fixed`。\n- **inline-block**：`display: inline-block`。\n- **overflow 非 visible**：`overflow: hidden/auto/scroll`。"
  }
}
```

A learner needs to recall all four triggers together — splitting would lose the "complete set" knowledge.

### Forbidden Patterns

| Pattern                                                                                                    | Problem                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Category colon-header before a list in `answer`/`evidence.description` (e.g., `"传输优化：\n\n- CDN..."`） | The claim already names the category. The header is redundant noise that breaks reading flow. |
| Bullet list in the `claim` field                                                                           | Claim must be prose. A list in claim signals a non-atomic, over-broad claim. Split it.        |
| Nested bullet lists                                                                                        | Signals the claim is over-broad. Flatten the structure or split the claim.                    |
| `explanation` that lists the same items already listed in `answer`                                         | Explanation must add mechanism/consequence, not restate the list.                             |
| Independent techniques grouped in one enumeration claim                                                    | Each independently applicable technique must be its own Shape A claim.                        |

---

## Typography and Layout Rules

These rules govern how to write markdown strings so the rendered output is visually clear and scannable. They apply to every markdown field: `claim`, `evidence.description`, `answer`, `explanation`, `question`.

### Core Principle

> A learner opens a card under time pressure. They scan first, read second. The layout must make structure visible in under 2 seconds — without reading every word.

This means: paragraph breaks carry meaning, spacing is not decorative, and dense walls of text are layout failures regardless of content quality.

### Paragraph Mechanics (apply to all prose fields)

**In JSON strings, `\n\n` creates a paragraph break (visual space between blocks). `\n` alone does not.**

| Situation                                    | Required separator             |
| -------------------------------------------- | ------------------------------ |
| Between two prose paragraphs                 | `\n\n`                         |
| Between prose and a code block               | `\n\n` (both before and after) |
| Between prose introduction and a bullet list | `\n\n`                         |
| Between bullet list items                    | `\n` (single)                  |
| Within a sentence (never break mid-sentence) | —                              |

**Sentence density rule:** Maximum 3 sentences per paragraph. If a paragraph has more than 3 sentences, find the semantic break and split with `\n\n`.

**Semicolon anti-pattern:** Do not use semicolons (`;`) to chain parallel concepts that should be distinct sentences or list items. Semicolons in dense prose make structure invisible to the scanner.

❌ `"内容区是放置文本或图片的实际区域；内边距是内容与边框之间的透明区域；边框是包裹在内边距和内容外的线条；外边距是与其他元素之间的空白区域。"`

✅ Use a list instead (Shape B) or rephrase as 2-sentence prose (Shape A):
`"盒模型由四个嵌套区域组成，从内到外分别是：\n\n- **内容区**：放置文本或图片的实际区域。\n- **内边距**：内容与边框之间的透明空白。\n- **边框**：包裹内边距和内容的线条。\n- **外边距**：盒子与其他元素之间的间隙，控制外部布局。"`

### Field-Specific Layout Rules

#### `claim` — reads as a headline assertion

- One continuous sentence or two tightly related sentences. No paragraph breaks inside `claim`.
- Inline `` `code` `` for technical identifiers. No fenced code blocks.
- No lists. No `\n` of any kind.

#### `evidence.description` — reads as the textbook explanation

**Shape A (mechanistic):**

```
[Sentence 1-3: mechanism — why it works, how it works. One thought per sentence.]
\n\n
[Sentence 1-2 (optional): consequence or contrast with the naive approach.]
\n\n
[Code block if present — always its own paragraph, never inline with prose.]
```

**Shape B (enumeration):**

```
[One setup sentence naming the category.]
\n\n
- **Label**: one self-contained sentence.
- **Label**: one self-contained sentence.
```

No paragraph after the list unless a follow-up note is genuinely additive.

#### `answer` — reads as the primary study surface

The learner spends most time on this field. Layout must be maximally scannable.

```
[Core assertion: 1-2 sentences restating the claim with key terms.]
\n\n
[Mechanism / supporting detail from evidence.description — prose or list, per shape.]
\n\n
[Code block if applicable — always its own paragraph.]
\n\n
[1 sentence of consequence or usage tip, if present in evidence.]
```

Never write `answer` as one long unbroken paragraph. If the content could not fit comfortably in a single breath when read aloud, it needs a `\n\n` break.

#### `question` — reads as a prompt

- One sentence only.
- For `fill_in_blank`: code block stem comes after the question sentence, separated by `\n\n`.
- No paragraph breaks inside the question sentence itself.

#### `explanation` — reads as the "why this matters" commentary

- 2–4 sentences total. Two short paragraphs acceptable if mechanism and consequence are naturally separate.
- Does NOT restate `answer`. Adds a new layer: mechanism chain, failure mode, or real-world consequence.
- Inline `` `code` `` acceptable. Fenced blocks only if a very short code snippet (2–3 lines) genuinely aids the explanation.

### Layout Self-Check (run before finalizing any field)

Before writing a field value, ask:

1. **Can a learner identify the structure in 2 seconds without reading every word?** If the field is longer than 3 sentences and has no `\n\n`, the answer is no.
2. **Are parallel items separated visually?** Parallel concepts joined by semicolons → convert to list.
3. **Do code blocks breathe?** Code blocks must have `\n\n` before and after, never merged into a prose sentence.
4. **Is the `claim` field prose-only with no line breaks?** Lists and `\n` inside `claim` are always wrong.

---

## Naming Rules

### Note ID / File Slug — mechanical derivation

```
Step 1 — domain
  If source filename is css.md           → "css"
  If source filename starts with js-     → "javascript"
  If source filename starts with vue-    → "vue"
  If source filename starts with network → "network"
  Otherwise                              → use the filename prefix as-is, lowercase

Step 2 — topic
  Take 1–3 key words from the note title.
  Lowercase. Remove all non-alphanumeric characters. Join with underscore.
  Example: "大文件上传与断点续传" → "large_file_upload"

Step 3 — note_id
  note_id = "note_" + domain + "_" + topic
  Example: "note_development_large_file_upload"

Step 4 — file slug (filename without extension)
  slug = note_id, with every underscore replaced by hyphen
  Example: "note-development-large-file-upload"

Step 5 — file paths
  note file:  "docs/notes/"  + slug + ".json"
  card file:  "docs/note-cards/" + slug + ".json"
```

Derive these once at the start of each note. All subsequent fields (`id`, `claim_ref`, file paths) copy from the values computed here.

### card_id

Format: `card_<claim_index>` (0-based, no date)

Examples: `card_0`, `card_1`, `card_2`

### claim_index

Always **0-based**. The first claim in `core_claims` is index `0`.

`claim_ref` format: `note_css_bfc:0`

---

## Index File Schema (`docs/index.json`)

`docs/index.json` is the central registry for all notes and cards. It is the primary source for hooks scanning and conflict detection — do not scan individual files when this index exists.

```json
{
  "last_updated": "YYYY-MM-DD",
  "notes": [
    {
      "id": "note_css_bfc",
      "title": "string",
      "domain": "css|javascript|vue|network|development|<other>",
      "source_path": "docs/raw/css.md",
      "file_path": "docs/notes/css-bfc.json",
      "claim_count": 5,
      "created_at": "YYYY-MM-DD"
    }
  ],
  "cards": [
    {
      "note_id": "note_css_bfc",
      "file_path": "docs/note-cards/css-bfc.json",
      "card_count": 5,
      "domain": "css"
    }
  ]
}
```

### Index Update Procedure

After writing all note and card files, run from project root:

```powershell
python scripts/ingest/update_index.py `
  --source docs/raw/<filename>.md `
  --notes  docs/notes/<slug1>.json docs/notes/<slug2>.json `
  --cards  docs/note-cards/<slug1>.json docs/note-cards/<slug2>.json
```

The script reads each note/card file, extracts the required fields, removes stale entries for this source from the existing index, appends new entries, and writes `docs/index.json`. Do not update index.json manually.

### Hooks Scan Using Index

Hooks are generated in the **Hooks Pass**, which runs after all files are written and `docs/index.json` is updated. See entropy-reduction.md Hooks Pass section for the full procedure.

During note generation, set `hooks: []` as a placeholder. Do not attempt hooks scan before files are written.

## File Output Procedure

**Use the `create_file` tool to write each JSON file directly. Do NOT use Python, Node.js, shell scripts, or any other runtime.**

Procedure for each output file:

1. Compose the full JSON object in memory as part of this response.
2. Call `create_file` with:
   - `filePath`: the absolute path to the target file (e.g. `d:/Workspace/.../docs/notes/css-bfc.json`)
   - `content`: the complete, valid JSON string
3. Do not create any intermediate files, temp files, or script files during this process.
4. Do not leave any `.py`, `.js`, `.ts`, `.sh`, or `.tmp` files in the workspace.
5. If a file already exists at the target path (re-ingest), use the appropriate tool to overwrite it — do not append.

Output order: write all note files first, then all card files. This ensures `note_id` references are stable before cards are written.

## Note File Schema (`docs/notes/<slug>.json`)

```json
{
  "id": "note_<domain>_<topic>",
  "title": "string",
  "metadata": {
    "created_at": "YYYY-MM-DD",
    "domain": "css|javascript|vue|network|development|<other>"
  },
  "source": {
    "input_path": "docs/raw/<file>.md",
    "line_range": [1, 100]
  },
  "content": {
    "core_claims": [
      {
        "claim": "string",
        "evidence": {
          "description": "markdown string — prose explanation and/or fenced code block"
        },
        "source_lines": [10, 20]
      }
    ],
    "refinement": {
      "anti_patterns": ["string — one mistake per element"]
    },
    "hooks": [],
    "hooks_meta": {
      "no_hook_reason": "string — required only when hooks is empty"
    }
  }
}
```

### Field Rules

**`domain`** — derive from source file name first (e.g. `css.md` → `"css"`, `js-functional.md` → `"javascript"`). If source covers multiple domains, use the primary domain of this specific note's topic cluster. Lowercase, no spaces.

**`evidence.description`** — mandatory markdown string. The description is self-documenting:

- If the source section contains a code block demonstrating the claim: `description` MUST include the actual fenced code block (` ``` `) plus the adjacent prose that explains it. Presence of a code fence in `description` is the canonical signal that this claim is code-backed.
- If the claim is derived from prose reasoning, benchmark data, or an analogy: `description` contains prose only.

Do NOT write a summary sentence in place of actual code. The renderer will display `description` verbatim.

**`anti_patterns`** — array of markdown strings. Each element describes one wrong approach. May include inline backticks (` `` `) for identifiers, property names, or very short code expressions to illustrate the mistake. Use a fenced code block only when the anti-pattern is best shown as a multi-line code sample.

**`source_lines`** — array of individual line numbers (integers) that directly support the claim. Use the actual line numbers from the source file. Not a `[start, end]` range — list each relevant line separately.

**`hooks_meta`** — only include this field when `hooks` is an empty array. Omit it when hooks has entries.

---

## Card File Schema (`docs/note-cards/<slug>.json`)

```json
{
  "note_id": "note_<domain>_<topic>",
  "metadata": {
    "created_at": "YYYY-MM-DD",
    "domain": "css|javascript|vue|network|development|<other>"
  },
  "cards": [
    {
      "card_id": "card_<claim_index>",
      "claim_ref": "note_<domain>_<topic>:<claim_index>",
      "type": "qa|fill_in_blank|error_correction",
      "question": "string",
      "answer": "string",
      "explanation": "string",
      "source_lines": [10, 20]
    }
  ]
}
```

- `note_id` must be copied verbatim from the corresponding note's `id` field.
- `metadata` must be copied verbatim from the corresponding note's `metadata` field.
- `claim_index` is 0-based (matches the array index in `core_claims`).

---

## Required Constraints

- `cards.length == content.core_claims.length`
- `claim_ref` is unique in one card file
- each `claim_ref` maps to exactly one claim index
- `hooks_meta.no_hook_reason` is required when `hooks` is empty; omit when hooks has entries
- do not include parent note fields

## Disallowed Patterns

- Fixed target counts for `anti_patterns`, `hooks`, or cards
- Card records without `claim_ref`
- Claim records without `source_lines`
