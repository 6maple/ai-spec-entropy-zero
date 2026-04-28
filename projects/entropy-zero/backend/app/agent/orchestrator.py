from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

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
                error_code="EMPTY_CONTENT", error_message="Markdown 内容为空"
            )

        self.update_task_progress("analyzing_structure", 10)
        lang = detect_language(self.inp.content)
        log.info(
            "Agent 路由: file=%s source_lang=%s",
            self.inp.file_name,
            lang,
        )
        sections, code_fences = analyze_structure(self.inp.content)
        router = LLMRouter(lang)

        # 并行提取 claims
        all_claims = []
        self.update_task_progress("extracting_claims", 30)

        with ThreadPoolExecutor(max_workers=6) as executor:
            # 提交所有 section 的任务，保持顺序
            futures_list = []
            for i, section in enumerate(sections, start=1):
                slice_text = _slice_lines(
                    self.inp.content, section.line_start, section.line_end
                )
                future = executor.submit(
                    extract_claims_for_section, section, slice_text, router, code_fences
                )
                futures_list.append((future, i, section.heading))

            # 按提交顺序收集结果
            for future, section_idx, heading in futures_list:
                percent = 30 + int(30 * section_idx / len(sections))
                self.update_task_progress("extracting_claims", percent)

                try:
                    claims = future.result()  # 阻塞等待结果
                    log.info(f"Section '{heading}' 提取了 {len(claims)} 个 claims")
                    all_claims.extend(claims)
                except Exception as err:
                    log.warning(f"提取 section '{heading}' 的 claims 失败: {err}")

        self.update_task_progress("partitioning_notes", 65)
        note_bundles = partition_notes(all_claims)
        _ = resolve_hooks(all_claims)

        # 并行生成卡片
        self.update_task_progress("generating_cards", 80)

        # 为每个 bundle 生成卡片，并维护 bundle -> cards 的映射
        bundle_cards_map: dict[str, list] = {}

        with ThreadPoolExecutor(max_workers=6) as executor:
            futures_cards = {
                executor.submit(generate_cards_for_note, bundle, router): bundle
                for bundle in note_bundles
            }

            for future in as_completed(futures_cards):
                bundle = futures_cards[future]
                try:
                    cards = future.result()
                    bundle_cards_map[bundle.title] = cards
                except (RuntimeError, ValueError, TypeError, KeyError) as err:
                    log.warning(
                        "Card generation failed for note '%s': %s", bundle.title, err
                    )
                    bundle_cards_map[bundle.title] = _fallback_cards_for_bundle(bundle)

        # 为每个 bundle 创建独立的 NotePayload
        note_payloads = []
        all_card_payloads = []

        for bundle in note_bundles:
            bundle_cards = bundle_cards_map.get(bundle.title, [])

            # 为这个 bundle 创建 points
            points = []
            for card in bundle_cards:
                claim = next(
                    (c for c in bundle.claims if c.claim_id == card.claim_ref), None
                )
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

            # 创建这个 bundle 的 note
            note = NotePayload(
                title=bundle.title,
                abstract=(
                    f"{bundle.title}\n\n{bundle.claims[0].assertion if bundle.claims else ''}"[
                        :280
                    ]
                    + (
                        "…"
                        if len(
                            f"{bundle.title}\n\n{bundle.claims[0].assertion if bundle.claims else ''}"
                        )
                        > 280
                        else ""
                    )
                ),
                tags=["agent", lang],
                points=points,
            )
            note_payloads.append(note)

            # 收集所有卡片
            all_card_payloads.extend(
                [
                    CardPayload(
                        point_id=c.point_id,
                        question=c.question,
                        answer=c.answer,
                        card_type=c.card_type,
                        explanation=c.explanation,
                        claim_ref=c.claim_ref,
                    )
                    for c in bundle_cards
                ]
            )

        return ProcessorSuccess(
            note_payloads=note_payloads,
            card_payloads=all_card_payloads,
            processing_summary=ProcessingSummary(
                point_count=sum(len(n.points) for n in note_payloads),
                card_count=len(all_card_payloads),
                source_file=self.inp.file_name,
            ),
        )


def _fallback_cards_for_bundle(bundle) -> list[CardPayload]:
    cards: list[CardPayload] = []
    for i, claim in enumerate(bundle.claims, start=1):
        answer = f"{claim.assertion}\n\n{claim.evidence.description}".strip()
        cards.append(
            CardPayload(
                point_id=f"p_{i}",
                question=f"{claim.topic} 的关键机制是什么？",
                answer=answer,
                card_type="qa",
                explanation="该卡片由系统在 LLM 失败时根据提炼结论自动生成。",
                claim_ref=claim.claim_id,
            )
        )
    return cards


def run_agent_processor(
    inp: ProcessorInput, update_task_progress: ProgressFn | None = None
) -> ProcessorResult:
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
