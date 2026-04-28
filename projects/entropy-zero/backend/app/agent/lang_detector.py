from __future__ import annotations

import logging

from app.agent.local_lang import detect_language_local

log = logging.getLogger("entropy.agent.lang_detector")


def detect_language(markdown_text: str) -> str:
    """文档语言：`zh` 或 `en`。使用本地字符统计（无远端调用）。"""
    lang = detect_language_local(markdown_text)
    log.info(
        "语言检测: method=local lang=%s",
        lang,
    )
    return lang
