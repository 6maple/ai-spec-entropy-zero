from __future__ import annotations

from collections import defaultdict
import logging

from app.agent.schemas import CoreClaim, NoteBundle

log = logging.getLogger("entropy.agent.note_partitioner")


def partition_notes(claims: list[CoreClaim]) -> list[NoteBundle]:
    if not claims:
        return []

    # 诊断日志：打印所有唯一的 section_headings
    unique_sections = set(
        claim.section_heading for claim in claims if claim.section_heading
    )
    log.info(
        f"📊 总共 {len(claims)} 个 claims，来自 {len(unique_sections)} 个不同的 sections"
    )
    log.info(f"   Unique sections: {list(unique_sections)[:10]}")  # 只显示前10个

    grouped: dict[str, list[CoreClaim]] = defaultdict(list)
    for claim in claims:
        key = (claim.section_heading or "General").strip()
        grouped[key].append(claim)

    log.info(f"📝 分组结果: {len(grouped)} 个 note bundles")
    for section_name, section_claims in list(grouped.items())[:5]:
        log.info(f"   - '{section_name}': {len(section_claims)} claims")

    if len(grouped) == 1:
        only_key = next(iter(grouped))
        return [NoteBundle(note_key="note-1", title=only_key, claims=grouped[only_key])]

    bundles: list[NoteBundle] = []
    for i, (topic, topic_claims) in enumerate(grouped.items(), start=1):
        bundles.append(
            NoteBundle(note_key=f"note-{i}", title=topic, claims=topic_claims)
        )
    return bundles
