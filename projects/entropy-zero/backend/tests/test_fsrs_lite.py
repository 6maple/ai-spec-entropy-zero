import unittest
from datetime import datetime, timezone

from app.services.fsrs_lite import run_fsrs_lite


class TestFsrsLite(unittest.TestCase):
    def test_good_rating_updates_state(self) -> None:
        now = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        st, next_r, _, _ = run_fsrs_lite(
            3,
            {"stability": 1.0, "difficulty": 2.0, "reps": 0},
            now=now,
            last_review=None,
            created_at=now,
        )
        self.assertEqual(st["reps"], 1)
        self.assertGreaterEqual(st["stability"], 1.0)
        self.assertGreater(next_r, now)

    def test_again_schedules_sooner_than_day(self) -> None:
        now = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        _st, next_r, _, _ = run_fsrs_lite(
            1,
            {"stability": 5.0, "difficulty": 1.0, "reps": 2},
            now=now,
            last_review=now,
            created_at=now,
        )
        self.assertLess((next_r - now).total_seconds(), 24 * 3600)


if __name__ == "__main__":
    unittest.main()
