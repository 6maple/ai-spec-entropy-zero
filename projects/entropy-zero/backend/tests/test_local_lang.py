import unittest

from app.agent.local_lang import detect_language_local


class TestLocalLang(unittest.TestCase):
    def test_zh_pure_cjk(self) -> None:
        text = "前端开发中块级格式化上下文用于处理浮动元素" * 20
        self.assertEqual(detect_language_local(text), "zh")

    def test_en_mostly_ascii(self) -> None:
        text = (
            "Python is a programming language. " * 15
            + "Used for backend services and data processing."
        )
        self.assertEqual(detect_language_local(text), "en")

    def test_default_zh_when_too_short_cleaned(self) -> None:
        self.assertEqual(detect_language_local(""), "zh")
        self.assertEqual(detect_language_local("```\n``` # # 1"), "zh")
