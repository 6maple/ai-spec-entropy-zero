#!/usr/bin/env python3
"""
Update docs/index.json after an ingest run.

Reads the specified note and card JSON files, extracts required fields,
removes any existing index entries for the same source file, then appends
the new entries and writes docs/index.json.

Usage:
  python scripts/ingest/update_index.py \\
    --source docs/raw/css.md \\
    --notes  docs/notes/css-bfc.json docs/notes/css-box-model.json \\
    --cards  docs/note-cards/css-bfc.json docs/note-cards/css-box-model.json

  Optionally override index path:
    --index  docs/index.json   (default)

Run from project root.
"""
import argparse
import json
import sys
from datetime import date
from pathlib import Path


def posix(path: str) -> str:
    """Normalize path separators to forward slashes."""
    return Path(path).as_posix()


def update_index(source_path, note_paths, card_paths, index_path="docs/index.json"):
    idx_file = Path(index_path)
    if idx_file.exists():
        with open(idx_file, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {"notes": [], "cards": []}

    source_posix = posix(source_path)

    # Remove existing note entries for this source
    index["notes"] = [
        n
        for n in index.get("notes", [])
        if posix(n.get("source_path", "")) != source_posix
    ]

    # Read new note files and collect their IDs (to clean up stale card entries)
    new_note_ids = set()
    for note_path in note_paths:
        with open(note_path, "r", encoding="utf-8") as f:
            note = json.load(f)
        new_note_ids.add(note["id"])
        index["notes"].append(
            {
                "id": note["id"],
                "title": note["title"],
                "domain": note["metadata"]["domain"],
                "source_path": posix(note["source"]["input_path"]),
                "file_path": posix(note_path),
                "claim_count": len(note["content"]["core_claims"]),
                "created_at": note["metadata"]["created_at"],
            }
        )

    # Remove existing card entries for these note IDs, then add new ones
    index["cards"] = [
        c for c in index.get("cards", []) if c.get("note_id") not in new_note_ids
    ]
    for card_path in card_paths:
        with open(card_path, "r", encoding="utf-8") as f:
            card_file = json.load(f)
        index["cards"].append(
            {
                "note_id": card_file["note_id"],
                "file_path": posix(card_path),
                "card_count": len(card_file["cards"]),
                "domain": card_file["metadata"]["domain"],
            }
        )

    index["last_updated"] = date.today().isoformat()

    idx_file.parent.mkdir(parents=True, exist_ok=True)
    with open(idx_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(
        f"index.json updated: {len(index['notes'])} notes, {len(index['cards'])} card files"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update docs/index.json after ingest.")
    parser.add_argument("--source", required=True, help="Source raw markdown file path")
    parser.add_argument(
        "--notes", nargs="+", required=True, help="Note JSON file paths"
    )
    parser.add_argument(
        "--cards", nargs="+", required=True, help="Card JSON file paths"
    )
    parser.add_argument("--index", default="docs/index.json", help="Index file path")
    args = parser.parse_args()
    update_index(args.source, args.notes, args.cards, args.index)
