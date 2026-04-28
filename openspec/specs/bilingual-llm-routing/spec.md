## ADDED Requirements

### Requirement: Language-keyed LLM routing

系统 SHALL 通过 `LLMRouter` 将 LLM 调用按 `source_lang` 路由到对应平台：`zh` 路由至阿里云百炼（`deepseek-v4-pro`，API Base `https://dashscope.aliyuncs.com/compatible-mode/v1`），`en` 路由至 Gemini（`gemini-3-flash-preview`，API Base `https://generativelanguage.googleapis.com/v1beta/openai/`）。两个平台均通过 OpenAI 兼容接口调用，共享重试与超时逻辑。

#### Scenario: Chinese document routes to Bailian

- **WHEN** `source_lang = "zh"` 且 `DASHSCOPE_API_KEY` 已配置
- **THEN** LLMRouter 使用阿里云百炼 API Base 和 `deepseek-v4-pro` 模型发起调用

#### Scenario: English document routes to Gemini

- **WHEN** `source_lang = "en"` 且 `GEMINI_API_KEY` 已配置
- **THEN** LLMRouter 使用 Gemini API Base 和 `gemini-3-flash-preview` 模型发起调用

#### Scenario: Missing API key raises explicit error

- **WHEN** 对应语言的 API Key 环境变量未配置
- **THEN** LLMRouter 在初始化时抛出明确的配置错误，不静默失败或使用默认值

---

### Requirement: Language-specific prompt templates

系统 SHALL 为每个提示任务维护独立的中英文 Prompt 模板文件（`{task}_{lang}.jinja2`），`LLMRouter` 在调用前按 `source_lang` 选择对应文件渲染。中文 Prompt MUST 以中文撰写指令，英文 Prompt MUST 以英文撰写指令。

#### Scenario: Chinese prompt selected for zh source

- **WHEN** `source_lang = "zh"` 且调用 `claim_extraction`
- **THEN** 系统渲染 `claim_extraction_zh.jinja2` 并发送至阿里云百炼

#### Scenario: English prompt selected for en source

- **WHEN** `source_lang = "en"` 且调用 `claim_extraction`
- **THEN** 系统渲染 `claim_extraction_en.jinja2` 并发送至 Gemini

---

### Requirement: Fallback to secondary model on primary failure

当检测到的语言对应的主模型不可用时（API 返回不可恢复错误或 Key 未配置），系统 SHALL 降级至另一语言的模型（配合对应语言 Prompt），降级后仍失败则返回 `ProcessorError("LLM_UNAVAILABLE")`，MUST 在日志中记录降级原因。

#### Scenario: Bailian unavailable falls back to Gemini

- **WHEN** `source_lang = "zh"` 且阿里云百炼 API 返回不可恢复错误（非限流）
- **THEN** LLMRouter 切换至 Gemini + 英文 Prompt 重试，并在日志记录降级事件

#### Scenario: Both models unavailable returns error

- **WHEN** 主模型和备用模型均不可用
- **THEN** 处理器返回 `ProcessorError`，`error_code = "LLM_UNAVAILABLE"`，任务标记为 `failed`

---

### Requirement: Rate limit handled with exponential backoff

当 LLM API 返回限流错误（HTTP 429 或等价响应）时，系统 SHALL 进行指数退避重试，最多重试 3 次，超出后将任务标记为 `failed` 并记录可展示的错误摘要。

#### Scenario: Rate limit triggers retry

- **WHEN** LLM API 响应 HTTP 429
- **THEN** 系统等待指数退避时间后重试，最多 3 次

#### Scenario: Retry exhausted marks task failed

- **WHEN** 连续 3 次重试后仍收到限流响应
- **THEN** 任务状态更新为 `failed`，`error_summary` 包含限流信息
## ADDED Requirements

### Requirement: Language-keyed LLM routing

系统 SHALL 通过 `LLMRouter` 将 LLM 调用按 `source_lang` 路由到对应平台：`zh` 路由至阿里云百炼（`deepseek-v4-pro`，API Base `https://dashscope.aliyuncs.com/compatible-mode/v1`），`en` 路由至 Gemini（`gemini-3-flash-preview`，API Base `https://generativelanguage.googleapis.com/v1beta/openai/`）。两个平台均通过 OpenAI 兼容接口调用，共享重试与超时逻辑。

#### Scenario: Chinese document routes to Bailian

- **WHEN** `source_lang = "zh"` 且 `DASHSCOPE_API_KEY` 已配置
- **THEN** LLMRouter 使用阿里云百炼 API Base 和 `deepseek-v4-pro` 模型发起调用

#### Scenario: English document routes to Gemini

- **WHEN** `source_lang = "en"` 且 `GEMINI_API_KEY` 已配置
- **THEN** LLMRouter 使用 Gemini API Base 和 `gemini-3-flash-preview` 模型发起调用

#### Scenario: Missing API key raises explicit error

- **WHEN** 对应语言的 API Key 环境变量未配置
- **THEN** LLMRouter 在初始化时抛出明确的配置错误，不静默失败或使用默认值

---

### Requirement: Language-specific prompt templates

系统 SHALL 为每个提示任务维护独立的中英文 Prompt 模板文件（`{task}_{lang}.jinja2`），`LLMRouter` 在调用前按 `source_lang` 选择对应文件渲染。中文 Prompt MUST 以中文撰写指令，英文 Prompt MUST 以英文撰写指令。

#### Scenario: Chinese prompt selected for zh source

- **WHEN** `source_lang = "zh"` 且调用 `claim_extraction`
- **THEN** 系统渲染 `claim_extraction_zh.jinja2` 并发送至阿里云百炼

#### Scenario: English prompt selected for en source

- **WHEN** `source_lang = "en"` 且调用 `claim_extraction`
- **THEN** 系统渲染 `claim_extraction_en.jinja2` 并发送至 Gemini

---

### Requirement: Fallback to secondary model on primary failure

当检测到的语言对应的主模型不可用时（API 返回不可恢复错误或 Key 未配置），系统 SHALL 降级至另一语言的模型（配合对应语言 Prompt），降级后仍失败则返回 `ProcessorError("LLM_UNAVAILABLE")`，MUST 在日志中记录降级原因。

#### Scenario: Bailian unavailable falls back to Gemini

- **WHEN** `source_lang = "zh"` 且阿里云百炼 API 返回不可恢复错误（非限流）
- **THEN** LLMRouter 切换至 Gemini + 英文 Prompt 重试，并在日志记录降级事件

#### Scenario: Both models unavailable returns error

- **WHEN** 主模型和备用模型均不可用
- **THEN** 处理器返回 `ProcessorError`，`error_code = "LLM_UNAVAILABLE"`，任务标记为 `failed`

---

### Requirement: Rate limit handled with exponential backoff

当 LLM API 返回限流错误（HTTP 429 或等价响应）时，系统 SHALL 进行指数退避重试，最多重试 3 次，超出后将任务标记为 `failed` 并记录可展示的错误摘要。

#### Scenario: Rate limit triggers retry

- **WHEN** LLM API 响应 HTTP 429
- **THEN** 系统等待指数退避时间后重试，最多 3 次

#### Scenario: Retry exhausted marks task failed

- **WHEN** 连续 3 次重试后仍收到限流响应
- **THEN** 任务状态更新为 `failed`，`error_summary` 包含限流信息
