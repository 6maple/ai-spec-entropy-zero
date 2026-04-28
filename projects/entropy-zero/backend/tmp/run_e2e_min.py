import json
import os
import time
from pathlib import Path

import httpx
import jwt
from dotenv import load_dotenv


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1]
    load_dotenv(base_dir / ".env")
    load_dotenv(base_dir / ".env.local", override=True)

    secret = os.getenv("DEV_JWT_SECRET")
    if not secret:
        raise RuntimeError("DEV_JWT_SECRET 未配置")

    sample_path = base_dir / "tmp" / "e2e_development_min.md"
    text = sample_path.read_text(encoding="utf-8")
    token = jwt.encode(
        {
            "sub": "e2e-user-001",
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        },
        secret,
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}

    with httpx.Client(
        base_url="http://127.0.0.1:8173/api",
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        with sample_path.open("rb") as f:
            up = client.post(
                "/raw/upload",
                headers=headers,
                files={"file": (sample_path.name, f, "text/markdown")},
            )
        up.raise_for_status()
        up_j = up.json()
        raw_id = up_j["raw_id"]

        proc = client.post(
            f"/raw/{raw_id}/process",
            headers=headers,
            json={"force_retry": False},
        )
        proc.raise_for_status()
        proc_j = proc.json()
        task_id = proc_j["task_id"]

        deadline = time.time() + 180
        task = None
        while time.time() < deadline:
            time.sleep(2)
            r = client.get(f"/tasks/{task_id}", headers=headers)
            r.raise_for_status()
            task = r.json()
            if task["status"] in ("completed", "failed"):
                break

        if not task:
            raise RuntimeError("未拿到 task 详情")

        raw = client.get(f"/raw/{raw_id}", headers=headers)
        raw.raise_for_status()
        raw_j = raw.json()

        notes = client.get(f"/notes/?raw_id={raw_id}", headers=headers)
        notes.raise_for_status()
        notes_j = notes.json()

    print(
        json.dumps(
            {
                "raw_id": raw_id,
                "task_id": task_id,
                "sample_chars": len(text),
                "sample_lines": len(text.splitlines()),
                "task": {
                    "status": task["status"],
                    "progress_percent": task["progress_percent"],
                    "error_msg": task["error_msg"],
                    "note_id": task["note_id"],
                    "flashcard_count": task["flashcard_count"],
                },
                "raw": {
                    "status": raw_j["status"],
                    "notes_count": raw_j["notes_count"],
                    "flashcards_count": raw_j["flashcards_count"],
                    "error_summary": raw_j["error_summary"],
                },
                "notes_count": len(notes_j),
                "first_note_title": notes_j[0]["title"] if notes_j else None,
                "first_note_abstract": notes_j[0]["abstract"] if notes_j else None,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
