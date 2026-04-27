from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class SectionMeta:
    heading: str
    level: int
    line_start: int
    line_end: int


@dataclass
class Evidence:
    description: str
    source_lines: list[int] = field(default_factory=list)


@dataclass
class CoreClaim:
    claim_id: str
    topic: str
    assertion: str
    evidence: Evidence
    anti_patterns: list[str] = field(default_factory=list)
    source_lines: list[int] = field(default_factory=list)
    section_heading: str = ""

    @property
    def claim_text(self) -> str:
        return f"{self.topic}: {self.assertion}".strip()


@dataclass
class NoteBundle:
    note_key: str
    title: str
    claims: list[CoreClaim] = field(default_factory=list)


@dataclass
class FlashcardPayload:
    point_id: str
    question: str
    answer: str
    card_type: Literal["qa", "error_correction", "fill_in_blank"] = "qa"
    explanation: str | None = None
    claim_ref: str | None = None


@dataclass
class AgentResult:
    note_payloads: list[dict]
    card_payloads: list[FlashcardPayload]

