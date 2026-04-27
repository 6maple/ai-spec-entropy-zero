"""Deterministic processor — no outbound LLM HTTP (Phase 1)."""

from __future__ import annotations

from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel, Field


class ProcessorInput(BaseModel):
    raw_id: str
    user_id: str
    content: str
    file_name: str


class NotePayload(BaseModel):
    title: str
    abstract: str
    tags: List[str] = Field(default_factory=list)
    points: List[dict[str, str]]


class CardPayload(BaseModel):
    point_id: str
    question: str
    answer: str
    card_type: Literal["qa", "error_correction", "fill_in_blank"] = "qa"
    explanation: str | None = None
    claim_ref: str | None = None


class ProcessingSummary(BaseModel):
    point_count: int
    card_count: int
    source_file: str


class ProcessorSuccess(BaseModel):
    note_payload: NotePayload
    card_payloads: List[CardPayload]
    processing_summary: ProcessingSummary


class ProcessorError(BaseModel):
    error_code: str
    error_message: str
    debug_hint: Optional[str] = None


ProcessorResult = Union[ProcessorSuccess, ProcessorError]


def _slug_title(file_name: str) -> str:
    base = file_name.rsplit(".", 1)[0] if "." in file_name else file_name
    return base[:500] if base else "未命名"


def run_deterministic_processor(inp: ProcessorInput) -> ProcessorResult:
    if not inp.content.strip():
        return ProcessorError(
            error_code="EMPTY_CONTENT",
            error_message="Markdown 内容为空",
        )

    title = _slug_title(inp.file_name)
    preview = inp.content.strip()[:280] + ("…" if len(inp.content.strip()) > 280 else "")
    p_id = "p_0"
    note = NotePayload(
        title=title,
        abstract=preview,
        tags=["占位", "phase1"],
        points=[
            {
                "p_id": p_id,
                "title": "摘录",
                "body": inp.content.strip()[:2000],
            }
        ],
    )    
    cards = [
        CardPayload(
            point_id=p_id,
            question=f"《{title}》中摘录的主要文本是什么？",
            answer=inp.content.strip()[:500] + ("…" if len(inp.content.strip()) > 500 else ""),
        )
    ]
    summary = ProcessingSummary(
        point_count=len(note.points),
        card_count=len(cards),
        source_file=inp.file_name,
    )
    return ProcessorSuccess(
        note_payload=note,
        card_payloads=cards,
        processing_summary=summary,
    )
