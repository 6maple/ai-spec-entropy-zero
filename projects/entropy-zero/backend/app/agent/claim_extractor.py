from __future__ import annotations

import json
import logging

from app.agent.llm_router import LLMRouter
from app.agent.schemas import CoreClaim, Evidence, SectionMeta

log = logging.getLogger("entropy.agent.claim_extractor")


def extract_claims_for_section(
    section: SectionMeta,
    source_slice: str,
    router: LLMRouter,
    code_fence_ranges: list[dict],
) -> list[CoreClaim]:
    payload = {
        "heading": section.heading,
        "source_slice": source_slice,
        "line_start": section.line_start,
        "line_end": section.line_end,
        "code_fence_ranges": code_fence_ranges,
    }
    for attempt in range(2):
        try:
            raw = router.call("claim_extraction", payload)
            return _validate_claims(raw, section)
        except json.JSONDecodeError:
            if attempt == 1:
                log.warning("Failed to parse claim extraction JSON for section=%s", section.heading)
                return []
    return []


def _validate_claims(raw: dict, section: SectionMeta) -> list[CoreClaim]:
    claims: list[CoreClaim] = []
    for idx, item in enumerate(raw.get("core_claims", []), start=1):
        topic = (item.get("topic") or "").strip()
        assertion = (item.get("assertion") or "").strip()
        if not topic or not assertion:
            continue
        evidence_data = item.get("evidence") or {}
        evidence = Evidence(
            description=(evidence_data.get("description") or "").strip(),
            source_lines=[int(x) for x in evidence_data.get("source_lines", []) if str(x).isdigit()],
        )
        claims.append(
            CoreClaim(
                claim_id=f"{section.heading}-{idx}",
                topic=topic,
                assertion=assertion,
                evidence=evidence,
                anti_patterns=[str(x) for x in item.get("anti_patterns", [])],
                source_lines=[int(x) for x in item.get("source_lines", []) if str(x).isdigit()],
                section_heading=section.heading,
            )
        )
    return claims

