from __future__ import annotations

from collections import defaultdict

from app.agent.schemas import CoreClaim, NoteBundle


def partition_notes(claims: list[CoreClaim]) -> list[NoteBundle]:
    if not claims:
        return []
    grouped: dict[str, list[CoreClaim]] = defaultdict(list)
    for claim in claims:
        key = (claim.section_heading or "General").strip()
        grouped[key].append(claim)

    if len(grouped) == 1:
        only_key = next(iter(grouped))
        return [NoteBundle(note_key="note-1", title=only_key, claims=grouped[only_key])]

    bundles: list[NoteBundle] = []
    for i, (topic, topic_claims) in enumerate(grouped.items(), start=1):
        bundles.append(NoteBundle(note_key=f"note-{i}", title=topic, claims=topic_claims))
    return bundles

