#!/usr/bin/env python3
"""
Parse a raw markdown source file into structural metadata only.

Outputs JSON to stdout with:
  total_lines      -- total line count
  section_ranges   -- list of { heading, level, line_start, line_end } (1-based, inclusive)
  code_fence_ranges-- list of { lang, line_start, line_end } (1-based, inclusive)

NOTE: Line content is intentionally excluded. Use get_section.py to retrieve
section content on demand, and scan_antipatterns.py to find signal-word lines.
This keeps the parse output small (structural metadata only).

Usage:
  python scripts/ingest/parse_source.py docs/raw/css.md
  python scripts/ingest/parse_source.py docs/raw/css.md > working_parse.json

Run from project root.
"""
import sys
import json
import re


def parse_source(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        raw_lines = f.read().splitlines()

    total = len(raw_lines)

    # section_ranges
    section_ranges = []
    for i, line in enumerate(raw_lines, 1):
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            level = len(m.group(1))
            heading = m.group(2).strip()
            if section_ranges:
                section_ranges[-1]["line_end"] = i - 1
            section_ranges.append(
                {"heading": heading, "level": level, "line_start": i, "line_end": total}
            )

    # code_fence_ranges
    code_fence_ranges = []
    fence_open = None
    for i, line in enumerate(raw_lines, 1):
        stripped = line.strip()
        if re.match(r"^(`{3,}|~{3,})", stripped):
            if fence_open is None:
                lang_m = re.match(r"^(?:`{3,}|~{3,})(\w*)", stripped)
                lang = lang_m.group(1) if lang_m else ""
                fence_open = {"lang": lang, "line_start": i, "line_end": None}
            else:
                fence_open["line_end"] = i
                code_fence_ranges.append(fence_open)
                fence_open = None
    if fence_open is not None:
        fence_open["line_end"] = total
        code_fence_ranges.append(fence_open)

    return {
        "total_lines": total,
        "section_ranges": section_ranges,
        "code_fence_ranges": code_fence_ranges,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_source.py <source_file>", file=sys.stderr)
        sys.exit(1)
    result = parse_source(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
