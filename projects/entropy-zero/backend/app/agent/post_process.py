"""将 LLM 结构化输出规范化为 ProcessorSuccess（含 meta_tag、typed notes、卡片）。"""

from __future__ import annotations

import logging
import re

from app.agent.claim_type_map import infer_card_type, normalize_claim_type
from app.agent.structured_schemas import LLMAgentOutput, LLMClaimItem, LLMNoteItem
from app.services.processor import (
    CardPayload,
    MetaTagPayload,
    NotePayload,
    PointPayload,
    ProcessingSummary,
    ProcessorSuccess,
)

log = logging.getLogger("entropy.agent.post_process")

_ABS_MAX = 280
_DOMAIN_MAX = 40
_TOPIC_MAX = 24
_TOPICS_MAX = 8


def normalize_meta_tag(mt) -> MetaTagPayload:
    domain = (getattr(mt, "domain", "") or "").strip() or "未分类"
    if len(domain) > _DOMAIN_MAX:
        domain = domain[:_DOMAIN_MAX]
    raw_topics = getattr(mt, "topics", None) or []
    if isinstance(raw_topics, str):
        raw_topics = [raw_topics] if raw_topics.strip() else []
    seen: set[str] = set()
    topics: list[str] = []
    for t in raw_topics:
        s = str(t).strip()
        if len(s) > _TOPIC_MAX:
            s = s[:_TOPIC_MAX]
        if s and s not in seen:
            seen.add(s)
            topics.append(s)
        if len(topics) >= _TOPICS_MAX:
            break
    return MetaTagPayload(domain=domain, topics=topics)


def _repair_p_ids(notes: list[LLMNoteItem]) -> None:
    for ni, note in enumerate(notes, start=1):
        for pi, claim in enumerate(note.claims, start=1):
            expected = f"n{ni}-p{pi}"
            if not (claim.p_id or "").strip():
                claim.p_id = expected
                continue
            if not re.fullmatch(r"n\d+-p\d+", (claim.p_id or "").strip()):
                claim.p_id = expected


def _truncate_abstract(text: str) -> str:
    t = (text or "").strip()
    if len(t) <= _ABS_MAX:
        return t
    return t[: _ABS_MAX - 1] + "…"


def _build_answer(claim: str, evidence: str) -> str:
    c = (claim or "").strip()
    e = (evidence or "").strip()
    if e:
        return f"{c}\n\n{e}".strip()
    return c


def build_processor_success(
    raw: LLMAgentOutput, *, source_lang: str, source_file: str
) -> ProcessorSuccess:
    meta_payload = normalize_meta_tag(raw.meta_tag)

    notes_out: list[NotePayload] = []
    cards_out: list[CardPayload] = []

    _repair_p_ids(raw.notes)

    for note in raw.notes:
        claim_type_raw, ctype_fixed = normalize_claim_type(note.claim_type)
        if ctype_fixed:
            log.warning("claim_type 已修正: %s -> %s", note.claim_type, claim_type_raw)

        valid_claims: list[LLMClaimItem] = []
        for c in note.claims:
            if not (c.claim or "").strip():
                continue
            valid_claims.append(c)
        if not valid_claims:
            continue

        title = (note.title or "").strip() or f"笔记-{claim_type_raw}"
        abstract = _truncate_abstract(note.abstract or title)

        tag_set = [claim_type_raw, meta_payload.domain, source_lang]
        tag_set.extend(meta_payload.topics[:5])
        tags = []
        seen_t: set[str] = set()
        for t in tag_set:
            if t and str(t) not in seen_t:
                seen_t.add(str(t))
                tags.append(str(t))

        points: list[PointPayload] = []
        for c in valid_claims:
            aq = _build_answer(c.claim, c.evidence)
            ctype = infer_card_type(claim_type_raw, c.claim, c.evidence or "")
            cards_out.append(
                CardPayload(
                    point_id=(c.p_id or "").strip(),
                    question=(c.card_question.question or "").strip()
                    or f"关于「{(c.title or title).strip()}」，核心结论是什么？",
                    answer=aq,
                    card_type=ctype,
                    explanation=c.card_question.explanation,
                    claim_ref=(c.p_id or "").strip() or None,
                )
            )
            points.append(
                PointPayload(
                    p_id=(c.p_id or "").strip(),
                    title=(c.title or "").strip() or title[:30],
                    body=(c.claim or "").strip(),
                    claim=(c.claim or "").strip(),
                    evidence=(c.evidence or "").strip(),
                    anti_patterns=[str(x) for x in (c.anti_patterns or [])],
                    hooks=[],
                )
            )

        notes_out.append(
            NotePayload(
                title=title,
                abstract=abstract,
                tags=tags,
                points=points,
                claim_type=claim_type_raw,
            )
        )

    return ProcessorSuccess(
        meta_tag=meta_payload,
        note_payloads=notes_out,
        card_payloads=cards_out,
        processing_summary=ProcessingSummary(
            point_count=len(cards_out),
            card_count=len(cards_out),
            source_file=source_file,
        ),
    )

