"""本地字符统计语言检测（无远端调用）。"""

from __future__ import annotations

import re

_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
_STRIP_RE = re.compile(r"[#*`\->\[\]()\d\s]|https?://\S+")


def detect_language_local(text: str) -> str:
    """Return 'zh' or 'en' using first 100 stripped chars from first 500; CJK ratio >= 25% => zh."""
    cleaned = _STRIP_RE.sub("", text[:500])[:100]
    if len(cleaned) < 20:
        return "zh"
    cjk_count = len(_CJK_RE.findall(cleaned))
    return "zh" if (cjk_count / len(cleaned)) >= 0.25 else "en"
