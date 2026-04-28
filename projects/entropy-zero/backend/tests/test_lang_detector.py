import unittest

from app.agent.lang_detector import detect_language


class TestLangDetectorLocal(unittest.TestCase):
    def test_chinese_long(self) -> None:
        text = "前端块级格式化上下文" * 40
        self.assertEqual(detect_language(text), "zh")

    def test_english_long(self) -> None:
        text = "The quick brown fox jumps over the lazy dog. " * 20
        self.assertEqual(detect_language(text), "en")
