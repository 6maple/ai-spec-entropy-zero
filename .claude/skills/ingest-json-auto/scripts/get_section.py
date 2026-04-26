#!/usr/bin/env python3
"""
Extract the content of one section from a raw markdown source file.

Each output line is prefixed with its 1-based line number so the model can
record source_lines without re-reading the file.

Output JSON:
  heading          -- section heading text
  line_start       -- first line of this section (1-based, inclusive)
  line_end         -- last line of this section (1-based, inclusive)
  code_fences      -- code fence ranges that fall entirely within this section
  annotated        -- section content with each line prefixed "[N] "

Usage (identify section by heading substring):
  python scripts/ingest/get_section.py docs/raw/css.md --heading "BFC"

Usage (identify section by explicit line range):
  python scripts/ingest/get_section.py docs/raw/css.md --lines 10 45

The --heading match is case-insensitive substring. If multiple sections match,
the first match is returned. To list all section headings first, use parse_source.py.

Run from project root.
"""
import argparse
import json
import re
import sys
from pathlib import Path


def read_lines(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read().splitlines()


def build_sections(raw_lines):
    total = len(raw_lines)
    sections = []
    for i, line in enumerate(raw_lines, 1):
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            if sections:
                sections[-1]["line_end"] = i - 1
            sections.append(
                {
                    "heading": m.group(2).strip(),
                    "level": len(m.group(1)),
                    "line_start": i,
                    "line_end": total,
                }
            )
    return sections


def build_fences(raw_lines):
    fences = []
    fence_open = None
    for i, line in enumerate(raw_lines, 1):
        stripped = line.strip()
        if re.match(r"^(`{3,}|~{3,})", stripped):
            if fence_open is None:
                lang_m = re.match(r"^(?:`{3,}|~{3,})(\w*)", stripped)
                fence_open = {
                    "lang": lang_m.group(1) if lang_m else "",
                    "line_start": i,
                    "line_end": None,
                }
            else:
                fence_open["line_end"] = i
                fences.append(fence_open)
                fence_open = None
    if fence_open:
        fence_open["line_end"] = len(raw_lines)
        fences.append(fence_open)
    return fences


def get_section(filepath, heading_query=None, line_start=None, line_end=None):
    raw_lines = read_lines(filepath)
    total = len(raw_lines)
    sections = build_sections(raw_lines)
    fences = build_fences(raw_lines)

    if heading_query is not None:
        query_lower = heading_query.lower()
        matched = next(
            (s for s in sections if query_lower in s["heading"].lower()), None
        )
        if matched is None:
            available = [s["heading"] for s in sections]
            print(
                f"ERROR: no section matching '{heading_query}'. Available: {available}",
                file=sys.stderr,
            )
            sys.exit(1)
        sec_start = matched["line_start"]
        sec_end = matched["line_end"]
        heading = matched["heading"]
    else:
        sec_start = line_start
        sec_end = min(line_end, total)
        heading = f"lines {sec_start}-{sec_end}"

    # Annotated content: each line prefixed with "[N] "
    annotated_lines = []
    for n in range(sec_start, sec_end + 1):
        annotated_lines.append(f"[{n}] {raw_lines[n - 1]}")
    annotated = "\n".join(annotated_lines)

    # Code fences within this section
    section_fences = [
        f for f in fences if f["line_start"] >= sec_start and f["line_end"] <= sec_end
    ]

    return {
        "heading": heading,
        "line_start": sec_start,
        "line_end": sec_end,
        "code_fences": section_fences,
        "annotated": annotated,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Extract one section from a markdown file."
    )
    parser.add_argument("source", help="Source markdown file path")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--heading", help="Case-insensitive substring of the section heading"
    )
    group.add_argument(
        "--lines",
        nargs=2,
        type=int,
        metavar=("START", "END"),
        help="Explicit 1-based line range (inclusive)",
    )
    args = parser.parse_args()

    if args.heading:
        result = get_section(args.source, heading_query=args.heading)
    else:
        result = get_section(
            args.source, line_start=args.lines[0], line_end=args.lines[1]
        )

    print(json.dumps(result, ensure_ascii=False, indent=2))
