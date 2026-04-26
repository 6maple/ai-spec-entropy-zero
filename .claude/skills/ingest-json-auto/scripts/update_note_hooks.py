#!/usr/bin/env python3
"""
Patch the hooks (and hooks_meta) field in a note JSON file.

Reads hook data from stdin as JSON. All other fields in the note are preserved unchanged.

Input JSON format (via stdin):
  Array form:    [ { "type": "...", "target_note_id": "...", "description": "..." }, ... ]
  Object form:   { "hooks": [...], "no_hook_reason": "optional string when hooks is empty" }

Usage:
  # With hooks (pipe JSON array):
  echo '[{"type":"supplement","target_note_id":"note_css_bfc","description":"..."}]' | \\
      python scripts/ingest/update_note_hooks.py docs/notes/css-box-model.json

  # Empty hooks with reason:
  echo '{"hooks":[],"no_hook_reason":"no related notes found"}' | \\
      python scripts/ingest/update_note_hooks.py docs/notes/css-box-model.json

  # PowerShell:
  '[{"type":"supplement",...}]' | python scripts/ingest/update_note_hooks.py docs/notes/foo.json

Run from project root.
"""
import json
import sys
from pathlib import Path


def update_hooks(note_path: str, hooks_input: str):
    note_file = Path(note_path)
    if not note_file.exists():
        print(f"ERROR: note file not found: {note_path}", file=sys.stderr)
        sys.exit(1)

    with open(note_file, "r", encoding="utf-8") as f:
        note = json.load(f)

    data = json.loads(hooks_input)
    if isinstance(data, list):
        hooks = data
        no_hook_reason = None
    else:
        hooks = data.get("hooks", [])
        no_hook_reason = data.get("no_hook_reason")

    # Patch only hooks-related fields; all other fields remain untouched
    note["content"]["hooks"] = hooks
    if hooks:
        note["content"].pop("hooks_meta", None)
    else:
        note["content"]["hooks_meta"] = {
            "no_hook_reason": no_hook_reason or "no related notes found"
        }

    with open(note_file, "w", encoding="utf-8") as f:
        json.dump(note, f, ensure_ascii=False, indent=2)

    print(f"Patched {note_path}: {len(hooks)} hook(s)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: echo '<hooks_json>' | python update_note_hooks.py <note_file>",
            file=sys.stderr,
        )
        sys.exit(1)
    hooks_json = sys.stdin.read().strip()
    if not hooks_json:
        print("ERROR: no hooks JSON received on stdin", file=sys.stderr)
        sys.exit(1)
    update_hooks(sys.argv[1], hooks_json)
