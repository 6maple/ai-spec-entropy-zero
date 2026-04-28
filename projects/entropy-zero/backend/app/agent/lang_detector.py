from __future__ import annotations

import logging
import re

from openai import OpenAI

from app.core.config import get_dashscope_api_key

log = logging.getLogger("entropy.agent.lang_detector")

_LANG_DETECT_MODEL = "qwen3.5-35b-a3b"
_DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"
# 轻量三段采样：前/中/各约 100 字，总长约 300，降低语言检测 token 消耗
_MAX_SAMPLE_CHARS = 300
_SLICE_CHARS = 100

_CJK_RE = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def detect_language(markdown_text: str) -> str:
    sampled_text = _sample_body_text(markdown_text)
    sample_chars = len(sampled_text)
    llm_result = _detect_with_llm(sampled_text)
    if llm_result in {"zh", "en"}:
        log.info(
            "语言检测: method=llm lang=%s sample_chars=%s",
            llm_result,
            sample_chars,
        )
        return llm_result
    ratio_result = _detect_with_ratio(sampled_text)
    log.info(
        "语言检测: method=ratio_fallback lang=%s sample_chars=%s",
        ratio_result,
        sample_chars,
    )
    return ratio_result


def _detect_with_llm(sampled_text: str) -> str | None:
    api_key = get_dashscope_api_key()
    if not api_key:
        return None
    try:
        client = OpenAI(base_url=_DASHSCOPE_BASE, api_key=api_key)
        response = client.chat.completions.create(
            model=_LANG_DETECT_MODEL,
            temperature=0.0,
            max_tokens=8,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "判断以下文本主要语言，只返回 `zh` 或 `en`，不要返回其它内容。\n\n"
                        f"{sampled_text}"
                    ),
                }
            ],
        )
        result = (response.choices[0].message.content or "").strip().lower()
        if "zh" in result:
            return "zh"
        if "en" in result:
            return "en"
        return None
    except Exception as exc:
        log.warning("Language detect LLM fallback to ratio due to: %s", exc)
        return None


def _sample_body_text(markdown_text: str) -> str:
    text = _extract_body_text(markdown_text)
    if len(text) <= _MAX_SAMPLE_CHARS:
        return text
    middle_start = max(0, (len(text) // 2) - (_SLICE_CHARS // 2))
    middle_end = min(len(text), middle_start + _SLICE_CHARS)
    parts = [
        text[:_SLICE_CHARS],
        text[middle_start:middle_end],
        text[-_SLICE_CHARS:],
    ]
    return "\n".join(part for part in parts if part).strip()


def _extract_body_text(markdown_text: str) -> str:
    content_lines: list[str] = []
    in_fence = False
    for raw_line in markdown_text.splitlines():
        line = raw_line.rstrip("\n")
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.lstrip().startswith("#"):
            continue
        if line.strip():
            content_lines.append(line)
    return "\n".join(content_lines).strip()


def _detect_with_ratio(text: str) -> str:
    if not text:
        return "en"
    total_chars = len(text)
    cjk_chars = len(_CJK_RE.findall(text))
    return "zh" if (cjk_chars / total_chars) >= 0.2 else "en"
