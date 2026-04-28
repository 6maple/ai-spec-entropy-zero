"""Mechanically derive flashcard type from claim_type and heuristic cues."""

from __future__ import annotations

import re

from typing import Literal

from app.agent.structured_schemas import CORE_CLAIM_TYPES

CardTypeName = Literal["qa", "error_correction", "fill_in_blank"]


def normalize_claim_type(raw: str) -> tuple[str, bool]:
    """返回 (类型, 是否经过修正)。非法值回落到 concept_definition。"""
    s = (raw or "").strip()
    if not s:
        return "concept_definition", True
    if s in CORE_CLAIM_TYPES:
        return s, False
    lowered = s.lower()
    if lowered.startswith("custom:"):
        suffix = lowered.split(":", 1)[1] if ":" in lowered else ""
        ok = bool(suffix) and re.fullmatch(r"[a-z][a-z0-9_]*", suffix)
        return (lowered, False) if ok else ("concept_definition", True)
    return "concept_definition", True


_CODE_FENCE_RE = re.compile(r"^\s*```")
_ERROR_HINT_RE = re.compile(
    r"(而不是|不应该|应避免|避免|instead\s+of|avoid|never\b|wrong)",
    re.IGNORECASE,
)


def infer_card_type(
    claim_type_norm: str, claim_text: str, evidence_text: str
) -> CardTypeName:
    blob = f"{claim_text}\n{evidence_text}".strip()
    if claim_type_norm == "pitfall_anti_pattern":
        return "error_correction"
    if _ERROR_HINT_RE.search(blob):
        return "error_correction"
    ev = evidence_text or ""
    if "```" in ev and (len(blob) > 80 or _CODE_FENCE_RE.search(ev)):
        return "fill_in_blank"
    return "qa"
