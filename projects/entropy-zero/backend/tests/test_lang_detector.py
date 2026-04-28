import unittest

from app.agent import lang_detector


class TestLangDetectorSampling(unittest.TestCase):
    def test_long_text_sample_is_bounded(self) -> None:
        body = "x" * 50_000
        md = "\n".join(f"line {i} {body[i : i + 10]}" for i in range(0, len(body), 10))
        sampled = lang_detector._sample_body_text(md)
        self.assertLessEqual(len(sampled), 350)
        self.assertGreater(len(sampled), 0)

    def test_ratio_prefers_chinese(self) -> None:
        out = lang_detector._detect_with_ratio("这是中文测试句子，用于比例回退。")
        self.assertEqual(out, "zh")

    def test_ratio_prefers_english(self) -> None:
        out = lang_detector._detect_with_ratio("This is an English-only paragraph for ratio fallback.")
        self.assertEqual(out, "en")
