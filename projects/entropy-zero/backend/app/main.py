"""
Entropy Zero Backend API

FastAPI application for Entropy Zero Phase 1.
Handles knowledge ingestion, note management, and flashcard reviews.
"""

import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import (
    get_dashscope_api_key,
    get_entropy_agent_enabled,
    get_worker_enabled,
)
from app.routers import raw_knowledge, notes, cards, tasks
from app.worker import worker_loop

log = logging.getLogger("entropy.api")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not (get_dashscope_api_key() or "").strip():
        log.warning(
            "DASHSCOPE_API_KEY 未设置：中文 Agent 管线与语言检测将不可用或失败，请在 .env 或 .env.local 中配置"
        )
    if not get_entropy_agent_enabled():
        log.warning(
            "ENTROPY_AGENT 非 1：与 .env.example 默认不一致；当前处理管线固定走 Agent，建议设为 1"
        )

    worker_task = None
    if get_worker_enabled():
        log.info("ENABLE_INTEGRATED_WORKER=1: 正在生命周期中启动内置 Worker 协程...")
        worker_task = asyncio.create_task(worker_loop())
    else:
        log.info(
            "ENABLE_INTEGRATED_WORKER=0: 不启动内置 Worker (如果需要背景处理，请确保有独立进程运行 app.worker)"
        )

    yield

    if worker_task:
        log.info("正在停止内置 Worker 协程...")
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            log.info("内置 Worker 协程已取消")
        except Exception:
            log.exception("内置 Worker 停机时发生异常")


app = FastAPI(
    title="Entropy Zero API",
    description="Backend API for Entropy Zero - Phase 1",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(raw_knowledge.router, prefix="/api/raw", tags=["Raw Knowledge"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(cards.router, prefix="/api/cards", tags=["Flashcards"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])


@app.get("/")
async def root():
    return {
        "message": "Entropy Zero API - Phase 1",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
