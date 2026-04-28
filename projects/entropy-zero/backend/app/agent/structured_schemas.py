"""Pydantic schemas for typed-bundle LLM JSON（单次调用输出校验）。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

CORE_CLAIM_TYPES = frozenset(
    {
        "concept_definition",
        "mechanism_principle",
        "procedure_workflow",
        "config_parameter",
        "comparison_contrast",
        "pitfall_anti_pattern",
        "best_practice",
        "performance_tradeoff",
    }
)


class LLMCardQuestion(BaseModel):
    question: str = ""
    explanation: str | None = None


class LLMClaimItem(BaseModel):
    p_id: str = ""
    title: str = ""
    claim: str = ""
    evidence: str = ""
    anti_patterns: list[str] = Field(default_factory=list)
    card_question: LLMCardQuestion = Field(default_factory=LLMCardQuestion)

    @model_validator(mode="before")
    @classmethod
    def _coerce_card_question(cls, data: Any) -> Any:
        if isinstance(data, dict):
            cq = data.get("card_question")
            if cq is None:
                data["card_question"] = {}
            elif isinstance(cq, str):
                data["card_question"] = {"question": cq, "explanation": None}
        return data


class LLMNoteItem(BaseModel):
    claim_type: str = ""
    title: str = ""
    abstract: str = ""
    claims: list[LLMClaimItem] = Field(default_factory=list)

    @field_validator("claim_type")
    @classmethod
    def _normalize_type(cls, v: str) -> str:
        return (v or "").strip()


class LLMMetaTag(BaseModel):
    domain: str = ""
    topics: list[str] = Field(default_factory=list)

    @field_validator("topics", mode="before")
    @classmethod
    def _topics_list(cls, v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v.strip()] if v.strip() else []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        return []


class LLMAgentOutput(BaseModel):
    meta_tag: LLMMetaTag = Field(default_factory=LLMMetaTag)
    notes: list[LLMNoteItem] = Field(default_factory=list)
