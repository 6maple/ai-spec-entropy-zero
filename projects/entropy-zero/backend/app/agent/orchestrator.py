"""单次 LLM 调用：claim_type + meta_tag + 协同提问。"""

from __future__ import annotations

import json
import logging
from collections.abc import Callable

from pydantic import ValidationError

from app.agent.local_lang import detect_language_local
from app.agent.llm_router import LLMRouter
from app.agent.post_process import build_processor_success
from app.agent.structured_schemas import LLMAgentOutput
from app.services.processor import (
    ProcessorError,
    ProcessorInput,
    ProcessorResult,
)

ProgressFn = Callable[[str, int], None]

log = logging.getLogger("entropy.agent.orchestrator")


class AgentOrchestrator:
    def __init__(
        self, inp: ProcessorInput, update_task_progress: ProgressFn | None = None
    ):
        self.inp = inp
        self.update_task_progress = update_task_progress or (
            lambda _step, _percent: None
        )

    def run(self) -> ProcessorResult:
        if not self.inp.content.strip():
            return ProcessorError(
                error_code="EMPTY_CONTENT",
                error_message="Markdown 内容为空",
            )

        self.update_task_progress("detecting_language", 8)
        lang = detect_language_local(self.inp.content)
        log.info(
            "Agent 路由: file=%s source_lang=%s",
            self.inp.file_name,
            lang,
        )

        self.update_task_progress("extracting_claims", 25)
        try:
            router = LLMRouter(lang)
        except RuntimeError as err:
            return ProcessorError(
                error_code="LLM_UNAVAILABLE",
                error_message=str(err) or "缺少大模型密钥",
                debug_hint="在 backend/.env 设置 DASHSCOPE_API_KEY 或 GEMINI_API_KEY",
            )

        raw_out = self._extract_with_retry(router)
        if isinstance(raw_out, ProcessorError):
            return raw_out

        self.update_task_progress("generating_cards", 78)
        success = build_processor_success(
            raw_out, source_lang=lang, source_file=self.inp.file_name
        )

        if not success.note_payloads:
            return ProcessorError(
                error_code="NO_VALID_CONTENT",
                error_message="未能从文档中提炼出有效知识点（无有效 Claim）",
                debug_hint="请检查 Markdown 是否为可提炼的技术内容",
            )

        self.update_task_progress("persisting", 95)
        return success

    def _extract_with_retry(
        self, router: LLMRouter
    ) -> LLMAgentOutput | ProcessorError:
        last_exc: BaseException | None = None
        for attempt in range(2):
            try:
                data = router.call("extract", {"content": self.inp.content})
                return LLMAgentOutput.model_validate(data)
            except json.JSONDecodeError as err:
                last_exc = err
                log.warning("模型返回非合法 JSON attempt=%s: %s", attempt + 1, err)
            except ValidationError as err:
                last_exc = err
                log.warning("LLM 输出 schema 校验失败 attempt=%s: %s", attempt + 1, err)
            except RuntimeError as err:
                if "LLM_UNAVAILABLE" in str(err) or "Missing required API key" in str(
                    err
                ):
                    return ProcessorError(
                        error_code="LLM_UNAVAILABLE",
                        error_message=str(err) or "大模型不可用",
                        debug_hint="检查 DASHSCOPE_API_KEY / GEMINI_API_KEY 与网络",
                    )
                last_exc = err
                log.warning("LLM 调用异常 attempt=%s: %s", attempt + 1, err)

        msg = (
            str(last_exc)
            if last_exc is not None
            else "无法解析模型返回的结构化 JSON"
        )
        return ProcessorError(
            error_code="AGENT_OUTPUT_INVALID",
            error_message=msg[:2000],
            debug_hint="可重试处理任务；若持续失败请检查模型输出是否为合法 JSON",
        )


def run_agent_processor(
    inp: ProcessorInput, update_task_progress: ProgressFn | None = None
) -> ProcessorResult:
    try:
        return AgentOrchestrator(inp, update_task_progress=update_task_progress).run()
    except Exception as exc:
        log.error("Agent orchestrator failed: %s", exc)
        return ProcessorError(
            error_code="LLM_UNAVAILABLE",
            error_message=str(exc) or "Agent 处理失败",
            debug_hint="检查 LLM API Key、网络连通性与输入大小",
        )
