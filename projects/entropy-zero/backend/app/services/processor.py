"""Legacy processor interface。确定性占位实现已退役，受控后备仅返回结构化错误。"""

from __future__ import annotations

from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator


class ProcessorInput(BaseModel):
    raw_id: str
    user_id: str
    content: str
    file_name: str


class PointPayload(BaseModel):
    p_id: str
    title: str
    body: str
    claim: str
    evidence: str
    anti_patterns: list[str] = Field(default_factory=list)
    hooks: list[dict] = Field(default_factory=list)

    @field_validator("anti_patterns", mode="before")
    @classmethod
    def _validate_anti_patterns(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [str(item) for item in value]
        raise TypeError("anti_patterns must be a string or list of strings")

    @field_validator("hooks", mode="before")
    @classmethod
    def _validate_hooks(cls, value):
        if value is None:
            return []
        if isinstance(value, dict):
            return [value]
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [{"value": value}]
        raise TypeError("hooks must be a dict, list of dicts, or string")


class MetaTagPayload(BaseModel):
    """文档级语义标签，持久化至 raw_knowledge.meta_tag_json。"""

    domain: str = ""
    topics: list[str] = Field(default_factory=list)


class NotePayload(BaseModel):
    title: str
    abstract: str
    tags: List[str] = Field(default_factory=list)
    points: List[PointPayload]
    claim_type: Optional[str] = None


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
    meta_tag: MetaTagPayload | None = None
    note_payloads: List[NotePayload]  # Changed from single to multiple
    card_payloads: List[CardPayload]
    processing_summary: ProcessingSummary


class ProcessorError(BaseModel):
    error_code: str
    error_message: str
    debug_hint: Optional[str] = None


ProcessorResult = Union[ProcessorSuccess, ProcessorError]


def run_deterministic_processor(inp: ProcessorInput) -> ProcessorResult:
    """受控后备：不产出占位标签、截断式正文或伪问答；调用方将收到明确错误码。"""
    if not inp.content.strip():
        return ProcessorError(
            error_code="EMPTY_CONTENT",
            error_message="Markdown 内容为空",
        )
    return ProcessorError(
        error_code="DETERMINISTIC_PROCESSOR_RETIRED",
        error_message="确定性占位处理已移除。Worker 现固定使用 AI Agent，请配置 ENTROPY_AGENT=1 与 DASHSCOPE_API_KEY 后重试。",
    )
