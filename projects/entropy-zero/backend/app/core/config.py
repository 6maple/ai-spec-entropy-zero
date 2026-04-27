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
