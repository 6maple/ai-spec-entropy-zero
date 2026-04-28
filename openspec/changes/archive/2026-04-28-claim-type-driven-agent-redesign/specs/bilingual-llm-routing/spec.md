## MODIFIED Requirements

### Requirement: Language-keyed LLM routing

系统 SHALL 在调用路由前执行本地语言检测，并按检测结果路由：`zh` 路由至阿里云百炼，`en` 路由至 Gemini。检测规则 MUST 基于有效字符中的 CJK 占比阈值（`>=25%` 为 `zh`）。

#### Scenario: Local detector drives zh routing
- **WHEN** 本地检测结果为 `source_lang = "zh"`
- **THEN** `LLMRouter` 使用阿里云百炼配置与中文 Prompt 进行调用

#### Scenario: Local detector drives en routing
- **WHEN** 本地检测结果为 `source_lang = "en"`
- **THEN** `LLMRouter` 使用 Gemini 配置与英文 Prompt 进行调用

### Requirement: Language-specific prompt templates

系统 SHALL 维护按语言区分的 Prompt 模板，并在同一次调用中根据 `source_lang` 选择对应模板。Prompt 语言 MUST 与路由语言一致，不允许中英文模板混用。

#### Scenario: Chinese prompt selected for zh source
- **WHEN** `source_lang = "zh"`
- **THEN** 系统渲染并发送中文模板

#### Scenario: English prompt selected for en source
- **WHEN** `source_lang = "en"`
- **THEN** 系统渲染并发送英文模板
