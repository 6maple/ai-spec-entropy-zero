"""
Phase 1 简化版 FSRS：用于更新 stability / difficulty / reps 与 next_review。

与完整 FSRS/Anki 行为不一致是预期，仅保证字段形状可持久化与可验收的间隔变化。
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional


def _tz_now(now: Optional[datetime]) -> datetime:
    t = now or datetime.now(timezone.utc)
    if t.tzinfo is None:
        t = t.replace(tzinfo=timezone.utc)
    return t


def run_fsrs_lite(
    rating: int,
    fsrs_state: dict[str, Any],
    *,
    now: Optional[datetime] = None,
    last_review: Optional[datetime] = None,
    created_at: Optional[datetime] = None,
) -> tuple[dict[str, float | int], datetime, int, int]:
    """
    返回: (新 fsrs_state, next_review, elapsed_days, scheduled_days)
    """
    t = _tz_now(now)
    base = last_review or created_at or t
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    elapsed_days = max(0, int((t - base).total_seconds() // 86400))

    s = float(fsrs_state.get("stability") or 0.0)
    d = float(fsrs_state.get("difficulty") or 0.0)
    reps = int(fsrs_state.get("reps") or 0)
    if s <= 0:
        s = 1.0
    d = min(10.0, max(0.0, d))
    prev_scheduled = max(1, int(round(s)))

    if rating not in (1, 2, 3, 4):
        raise ValueError("rating must be 1..4")

    reps += 1
    if rating == 1:
        s = max(0.2, s * 0.25)
        d = min(10.0, d + 0.8)
        next_t = t + timedelta(minutes=10)
    elif rating == 2:
        s = max(0.4, s * 0.85)
        d = min(10.0, d + 0.35)
        next_t = t + timedelta(days=min(30.0, max(0.5, s * 0.6)))
    elif rating == 3:
        s = min(120.0, s * 1.45 + 0.5)
        d = max(0.0, d - 0.1)
        next_t = t + timedelta(days=min(120.0, max(1.0, s * 0.9)))
    else:
        s = min(180.0, s * 1.7 + 1.0)
        d = max(0.0, d - 0.2)
        next_t = t + timedelta(days=min(180.0, max(1.5, s * 1.0)))

    new_state: dict[str, float | int] = {
        "stability": round(s, 4),
        "difficulty": round(d, 4),
        "reps": reps,
    }
    return new_state, next_t, elapsed_days, prev_scheduled
