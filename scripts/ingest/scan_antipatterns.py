#!/usr/bin/env python3
"""
Scan a raw markdown source file for anti-pattern signal words.

Returns all matching lines plus ±1 context lines, annotated with line numbers.
The model uses this output to write content.refinement.anti_patterns without
needing to scan the full source file manually.

Output JSON:
  matches -- list of { line_num, signal_word, lines: "[N] content\n[N+1] content\n..." }
  total_matches -- count

Usage:
  python scripts/ingest/scan_antipatterns.py docs/raw/css.md

Run from project root.
"""
import json
import re
import sys

# Signal words indicating mistakes / wrong approaches
SIGNAL_WORDS_ZH = [
    "错误",
    "不应该",
    "避免",
    "误区",
    "注意",
    "不能",
    "禁止",
    "不推荐",
    "而不是",
    "容易忽略",
    "陷阱",
]
SIGNAL_WORDS_EN = [
    "wrong",
    "avoid",
    "pitfall",
    "trap",
    "don't",
    "dont",
    "instead",
    "mistake",
    "common error",
    "gotcha",
    "never",
]
ALL_SIGNALS = SIGNAL_WORDS_ZH + SIGNAL_WORDS_EN


def scan_antipatterns(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        raw_lines = f.read().splitlines()
    total = len(raw_lines)

    matches = []
    seen_lines = set()  # avoid duplicate context overlap

    for i, line in enumerate(raw_lines, 1):
        line_lower = line.lower()
        hit_signal = next((s for s in ALL_SIGNALS if s.lower() in line_lower), None)
        if hit_signal is None:
            continue

        # Gather context: 1 line before + match line + 1 line after
        ctx_start = max(1, i - 1)
        ctx_end = min(total, i + 1)
        context_lines = []
        for n in range(ctx_start, ctx_end + 1):
            context_lines.append(f"[{n}] {raw_lines[n - 1]}")

        # Skip if primary match line was already covered by a previous match's context
        if i in seen_lines:
            continue
        for n in range(ctx_start, ctx_end + 1):
            seen_lines.add(n)

        matches.append(
            {
                "line_num": i,
                "signal_word": hit_signal,
                "lines": "\n".join(context_lines),
            }
        )

    return {"total_matches": len(matches), "matches": matches}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scan_antipatterns.py <source_file>", file=sys.stderr)
        sys.exit(1)
    result = scan_antipatterns(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
