from __future__ import annotations

import re

from app.agent.schemas import SectionMeta


_HEADING_RE = re.compile(r"^(#{2,6})\s+(.*)$")


def analyze_structure(markdown_text: str) -> tuple[list[SectionMeta], list[dict]]:
    lines = markdown_text.splitlines()
    sections: list[SectionMeta] = []
    code_fence_ranges: list[dict] = []
    pending_start: int | None = None
    pending_lang = ""
    section_headers: list[tuple[int, int, str]] = []

    for idx, line in enumerate(lines, start=1):
        if line.strip().startswith("```"):
            if pending_start is None:
                pending_start = idx
                pending_lang = line.strip().removeprefix("```").strip()
            else:
                code_fence_ranges.append(
                    {
                        "lang": pending_lang or "text",
                        "line_start": pending_start,
                        "line_end": idx,
                    }
                )
                pending_start = None
                pending_lang = ""

        m = _HEADING_RE.match(line.strip())
        if m:
            section_headers.append((idx, len(m.group(1)), m.group(2).strip()))

    if not section_headers:
        return [SectionMeta(heading="Document", level=2, line_start=1, line_end=len(lines))], code_fence_ranges

    for i, (line_start, level, heading) in enumerate(section_headers):
        line_end = section_headers[i + 1][0] - 1 if i + 1 < len(section_headers) else len(lines)
        sections.append(
            SectionMeta(
                heading=heading or f"Section {i + 1}",
                level=level,
                line_start=line_start,
                line_end=max(line_start, line_end),
            )
        )
    return sections, code_fence_ranges

