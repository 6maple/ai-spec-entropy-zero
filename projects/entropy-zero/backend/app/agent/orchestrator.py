from __future__ import annotations

from collections.abc import Callable

from app.agent.card_generator import generate_cards_for_note
from app.agent.claim_extractor import extract_claims_for_section
from app.agent.hooks_resolver import resolve_hooks
from app.agent.lang_detector import detect_language
from app.agent.llm_router import LLMRouter
from app.agent.note_partitioner import partition_notes
from app.agent.structure_analyzer import analyze_structure
from app.services.processor import (
    CardPayload,
    NotePayload,
    ProcessingSummary,
    ProcessorError,
    ProcessorInput,
    ProcessorResult,
    ProcessorSuccess,
)

ProgressFn = Callable[[str, int], None]


class AgentOrchestrator:
    def __init__(self, inp: ProcessorInput, update_task_progress: ProgressFn | None = None):
        self.inp = inp
        self.update_task_progress = update_task_progress or (lambda _step, _percent: None)

    def run(self) -> ProcessorResult:
        if not self.inp.content.strip():
            return ProcessorError(error_code="EMPTY_CONTENT", error_message="Markdown 内容为空")

        self.update_task_progress("analyzing_structure", 10)
        lang = detect_language(self.inp.content)
        sections, code_fences = analyze_structure(self.inp.content)
        router = LLMRouter(lang)

        all_claims = []
        for i, section in enumerate(sections, start=1):
            percent = 30 + int(30 * i / max(1, len(sections)))
            self.update_task_progress("extracting_claims", percent)
            slice_text = _slice_lines(self.inp.content, section.line_start, section.line_end)
            all_claims.extend(extract_claims_for_section(section, slice_text, router, code_fences))

        self.update_task_progress("partitioning_notes", 65)
        note_bundles = partition_notes(all_claims)
        _ = resolve_hooks(all_claims)

        self.update_task_progress("generating_cards", 80)
        generated_cards = []
        for bundle in note_bundles:
            generated_cards.extend(generate_cards_for_note(bundle, router))

        points = []
        for card in generated_cards:
            claim = next((c for c in all_claims if c.claim_id == card.claim_ref), None)
            points.append(
                {
                    "p_id": card.point_id,
                    "title": claim.topic if claim else "Claim",
                    "body": claim.assertion if claim else card.answer,
                    "claim": claim.claim_text if claim else "",
                    "evidence": claim.evidence.description if claim else "",
                    "anti_patterns": claim.anti_patterns if claim else [],
                    "hooks": [],
                }
            )

        note = NotePayload(
            title=note_bundles[0].title if note_bundles else self.inp.file_name,
            abstract=(self.inp.content.strip()[:280] + ("…" if len(self.inp.content.strip()) > 280 else "")),
            tags=["agent", lang],
            points=points,
        )
        card_payloads = [
            CardPayload(
                point_id=c.point_id,
                question=c.question,
                answer=c.answer,
                card_type=c.card_type,
                explanation=c.explanation,
                claim_ref=c.claim_ref,
            )
            for c in generated_cards
        ]
        return ProcessorSuccess(
            note_payload=note,
            card_payloads=card_payloads,
            processing_summary=ProcessingSummary(
                point_count=len(points), card_count=len(card_payloads), source_file=self.inp.file_name
            ),
        )


def run_agent_processor(inp: ProcessorInput, update_task_progress: ProgressFn | None = None) -> ProcessorResult:
    try:
        return AgentOrchestrator(inp, update_task_progress=update_task_progress).run()
    except Exception as exc:
        return ProcessorError(
            error_code="LLM_UNAVAILABLE",
            error_message=str(exc) or "Agent 处理失败",
            debug_hint="检查 LLM API Key 与网络连通性",
        )


def _slice_lines(markdown_text: str, line_start: int, line_end: int) -> str:
    lines = markdown_text.splitlines()
    return "\n".join(lines[max(0, line_start - 1) : max(line_start, line_end)])

