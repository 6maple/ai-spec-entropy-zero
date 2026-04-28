from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import Template
from openai import APIError, OpenAI, RateLimitError

from app.core import config

log = logging.getLogger("entropy.agent.llm_router")
_PROMPTS_DIR = Path(__file__).parent / "prompts"


@dataclass
class LLMProfile:
    api_base: str
    api_key_env: str
    model: str
    temperature: float = 0.1


LANG_PROFILES = {
    "zh": LLMProfile(
        api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key_env="DASHSCOPE_API_KEY",
        model="qwen-plus",
    ),
    "en": LLMProfile(
        api_base="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key_env="GEMINI_API_KEY",
        model="gemini-3-flash-preview",
    ),
}


def _parse_llm_json(text: str | None) -> dict[str, Any]:
    """解析模型输出，剥离 ```json ``` 围栏。"""
    s = (text or "").strip()
    if not s:
        raise json.JSONDecodeError("Expecting value", "", 0)
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    return json.loads(s)


class LLMRouter:
    def __init__(self, source_lang: str):
        if source_lang not in LANG_PROFILES:
            raise ValueError(f"Unsupported source_lang: {source_lang}")
        self.source_lang = source_lang
        self.primary_profile = LANG_PROFILES[source_lang]
        self.fallback_lang = "en" if source_lang == "zh" else "zh"
        self.fallback_profile = LANG_PROFILES[self.fallback_lang]

        self.primary_client = OpenAI(
            base_url=self.primary_profile.api_base,
            api_key=self._resolve_api_key(
                self.primary_profile.api_key_env, required=True
            ),
        )
        fallback_key = self._resolve_api_key(
            self.fallback_profile.api_key_env, required=False
        )
        self.fallback_client = (
            OpenAI(base_url=self.fallback_profile.api_base, api_key=fallback_key)
            if fallback_key
            else None
        )

    def _resolve_api_key(self, key_name: str, required: bool) -> str | None:
        key = (
            config.get_dashscope_api_key()
            if key_name == "DASHSCOPE_API_KEY"
            else config.get_gemini_api_key()
        )
        if required and not key:
            raise RuntimeError(f"Missing required API key: {key_name}")
        return key or None

    def call(self, prompt_name: str, variables: dict[str, Any]) -> dict[str, Any]:
        try:
            rendered = self._render_prompt(prompt_name, self.source_lang, variables)
            text = self._call_with_retries(
                self.primary_client, self.primary_profile, rendered
            )
            return _parse_llm_json(text)
        except (APIError, RuntimeError, json.JSONDecodeError) as primary_error:
            if self.fallback_client is None:
                raise RuntimeError("LLM_UNAVAILABLE") from primary_error
            log.warning("Primary LLM failed, fallback triggered: %s", primary_error)
            rendered = self._render_prompt(prompt_name, self.fallback_lang, variables)
            text = self._call_with_retries(
                self.fallback_client, self.fallback_profile, rendered
            )
            return _parse_llm_json(text)

    def _render_prompt(
        self, prompt_name: str, lang: str, variables: dict[str, Any]
    ) -> str:
        prompt_path = _PROMPTS_DIR / f"{prompt_name}_{lang}.jinja2"
        template = Template(prompt_path.read_text(encoding="utf-8"))
        return template.render(**variables)

    def _call_with_retries(
        self, client: OpenAI, profile: LLMProfile, prompt: str
    ) -> str:
        for attempt in range(3):
            try:
                response = client.chat.completions.create(
                    model=profile.model,
                    temperature=profile.temperature,
                    max_tokens=config.get_ai_max_tokens(),
                    messages=[{"role": "user", "content": prompt}],
                )
                return (response.choices[0].message.content or "").strip()
            except RateLimitError:
                if attempt == 2:
                    raise
                time.sleep(2**attempt)
        raise RuntimeError("LLM_UNAVAILABLE")
