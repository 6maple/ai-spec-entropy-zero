"""Redis-backed queue for processing jobs (local Redis or Upstash)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

import redis.asyncio as redis

from app.core.config import get_queue_name

log = logging.getLogger(__name__)
_redis: Optional[redis.Redis] = None


def _redis_url() -> Optional[str]:
    return os.getenv("UPSTASH_REDIS_URL") or os.getenv("REDIS_URL") or None


def _inline_queue_enabled() -> bool:
    return os.getenv("ENTROPY_INLINE_QUEUE", "").lower() in ("1", "true", "yes")


async def get_redis() -> redis.Redis:
    global _redis
    if _inline_queue_enabled():
        raise RuntimeError("内联队列模式下不使用 Redis")
    if _redis is not None:
        return _redis
    url = _redis_url()
    if not url:
        raise RuntimeError(
            "未配置 REDIS_URL 或 UPSTASH_REDIS_URL，无法使用队列（请先启动 Redis 并写入 backend/.env）"
        )
    _redis = redis.from_url(url, decode_responses=True)
    return _redis


@dataclass
class ProcessJobPayload:
    task_id: str
    raw_id: str
    user_id: str
    task_type: str = "entropy_deconstruction"

    def to_json(self) -> str:
        return json.dumps(
            {
                "task_id": self.task_id,
                "raw_id": self.raw_id,
                "user_id": self.user_id,
                "task_type": self.task_type,
            },
            separators=(",", ":"),
        )

    @classmethod
    def from_json(cls, data: str) -> ProcessJobPayload:
        d: dict[str, Any] = json.loads(data)
        return cls(
            task_id=d["task_id"],
            raw_id=d["raw_id"],
            user_id=d["user_id"],
            task_type=d.get("task_type", "entropy_deconstruction"),
        )


async def enqueue_process_job(payload: ProcessJobPayload) -> None:
    if _inline_queue_enabled():
        from app.worker import process_job

        log.warning(
            "ENTROPY_INLINE_QUEUE 已启用：任务在当前 API 进程内异步执行，仅用于无 Redis 的本地验证"
        )
        asyncio.create_task(process_job(payload))
        return
    r = await get_redis()
    await r.rpush(get_queue_name(), payload.to_json())


async def dequeue_process_job(timeout_sec: int = 5) -> Optional[ProcessJobPayload]:
    r = await get_redis()
    item = await r.blpop(get_queue_name(), timeout=timeout_sec)
    if not item:
        return None
    _, raw = item
    return ProcessJobPayload.from_json(raw)


async def ack_job(_payload: ProcessJobPayload) -> None:
    """List-based queue: no-op after successful BLPOP."""


async def nack_job(payload: ProcessJobPayload, retryable: bool = True) -> None:
    if retryable:
        r = await get_redis()
        await r.rpush(get_queue_name(), payload.to_json())
