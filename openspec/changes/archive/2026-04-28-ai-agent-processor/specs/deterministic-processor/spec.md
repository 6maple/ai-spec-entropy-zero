## MODIFIED Requirements

### Requirement: No outbound LLM vendor HTTP

本约束 SHALL 按 `ENTROPY_AGENT` 環境變量區分生效範圍：

- 當 `ENTROPY_AGENT=0` 或未設置時，代碼路徑 MUST NOT 包含向大模型供應商發起的 HTTP 客戶端調用；處理器 MUST 為規則或確定性佔位實現（與原約束完全一致）。
- 當 `ENTROPY_AGENT=1` 時，AI Agent 路徑 MAY 向已配置的 LLM 供應商（阿里云百炼或 Gemini）發起 HTTP 調用；此路徑 MUST 通過 `LLMRouter` 封裝，不得在 Processor 組件外直接散佈 HTTP 客戶端代碼。

錯誤路徑 SHALL 使用 `error_code`、`error_message`（及可選 `debug_hint`），不得用未定義結構掩蓋失敗。此約束在兩條路徑下均適用。

#### Scenario: Reject processor implementation with vendor client outside router

- **WHEN** 代碼審查發現針對外部 LLM API 的 HTTP 客戶端調用出現在 `LLMRouter` 之外的模塊中（如直接在 `ClaimExtractor` 內硬編碼 requests 調用）
- **THEN** 該實現 MUST 被拒絕，所有 LLM HTTP 調用必須經由 `LLMRouter`

#### Scenario: Deterministic path unchanged when agent disabled

- **WHEN** `ENTROPY_AGENT=0` 或未設置，且 Worker 觸發處理
- **THEN** 系統調用 `run_deterministic_processor`，不發起任何外部 HTTP 調用，行為與 Phase 1 完全一致

#### Scenario: Structured error on processor failure

- **WHEN** 處理器（確定性或 Agent 路徑）返回業務錯誤結構
- **THEN** Worker 將 `raw_knowledge` 置為 `failed` 並持久化可展示的錯誤摘要
