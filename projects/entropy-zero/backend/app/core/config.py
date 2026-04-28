"""Runtime configuration from environment variables."""

import os
from functools import lru_cache


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return int(raw)


@lru_cache
def get_max_md_upload_bytes() -> int:
    return _int_env("MAX_MD_UPLOAD_BYTES", 1_048_576)


def get_queue_name() -> str:
    return os.getenv("ENTROPY_QUEUE_NAME", "entropy:process_queue")


def get_entropy_agent_enabled() -> bool:
    return os.getenv("ENTROPY_AGENT", "0") == "1"


def get_dashscope_api_key() -> str:
    return os.getenv("DASHSCOPE_API_KEY", "")


def get_gemini_api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "")


@lru_cache
def get_ai_max_tokens() -> int:
    return _int_env("AI_MAX_TOKENS", 4096)


def get_worker_enabled() -> bool:
    """Whether to run the background worker within the FastAPI process."""
    return os.getenv("ENABLE_INTEGRATED_WORKER", "0") == "1"
