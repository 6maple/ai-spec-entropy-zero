"""Standalone worker: dequeue → Agent processor → persist notes/cards."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.db.database import get_async_session_maker
from app.db.models import Flashcard, Note, ProcessingTask, RawKnowledge
from app.agent.orchestrator import run_agent_processor
from app.core.config import get_entropy_agent_enabled
from app.services.processor import (
    ProcessorError,
    ProcessorInput,
    ProcessorSuccess,
    run_deterministic_processor,
)
from app.services.queue_service import ProcessJobPayload, dequeue_process_job

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("entropy.worker")


async def process_job(job: ProcessJobPayload) -> None:
    maker = get_async_session_maker()
    async with maker() as session:
        async with session.begin():
            stmt_r = (
                select(RawKnowledge)
                .where(RawKnowledge.raw_id == job.raw_id)
                .with_for_update()
            )
            raw = (await session.execute(stmt_r)).scalar_one_or_none()
            stmt_t = (
                select(ProcessingTask)
                .where(ProcessingTask.task_id == job.task_id)
                .with_for_update()
            )
            task = (await session.execute(stmt_t)).scalar_one_or_none()
            if (
                not raw
                or not task
                or raw.user_id != job.user_id
                or task.user_id != job.user_id
            ):
                log.warning("Stale or missing job rows for %s", job.raw_id)
                return
            if raw.status != "processing":
                log.warning("Raw %s not in processing, skipping", job.raw_id)
                return
            task.status = "processing"
            task.current_step = "extracting_points"
            task.progress_percent = 35
            log.info(
                "更新任务状态: task_id=%s, status=processing, progress=35%%",
                job.task_id,
            )

        log.info("第一个事务已提交，开始调用 Agent 处理器: raw_id=%s", job.raw_id)
        inp = ProcessorInput(
            raw_id=raw.raw_id,
            user_id=raw.user_id,
            content=raw.content,
            file_name=raw.file_name,
        )
        progress_state: dict[str, int | str] = {
            "step": "extracting_points",
            "percent": 35,
        }

        def update_task_progress(step: str, percent: int) -> None:
            progress_state["step"] = step
            progress_state["percent"] = percent
            log.info("进度更新: step=%s, percent=%d%%", step, percent)

        log.info(
            "开始执行处理器 ENTROPY_AGENT=%s …",
            get_entropy_agent_enabled(),
        )
        if not get_entropy_agent_enabled():
            result = run_deterministic_processor(inp)
        else:
            result = run_agent_processor(
                inp, update_task_progress=update_task_progress
            )
        log.info("Agent 处理器完成，结果类型: %s", type(result).__name__)

        async with session.begin():
            stmt_r2 = (
                select(RawKnowledge)
                .where(RawKnowledge.raw_id == job.raw_id)
                .with_for_update()
            )
            raw2 = (await session.execute(stmt_r2)).scalar_one_or_none()
            stmt_t2 = (
                select(ProcessingTask)
                .where(ProcessingTask.task_id == job.task_id)
                .with_for_update()
            )
            task2 = (await session.execute(stmt_t2)).scalar_one_or_none()
            if not raw2 or not task2 or raw2.status != "processing":
                return

            if isinstance(result, ProcessorError):
                raw2.status = "failed"
                raw2.error_summary = result.error_message
                raw2.processed_at = None
                task2.status = "failed"
                task2.error_msg = result.error_message
                task2.progress_percent = 0
                task2.current_step = "failed"
                return

            assert isinstance(result, ProcessorSuccess)

            # 调试日志：检查生成了几个 note_payload
            log.info(
                f"📊 ProcessorSuccess 包含 {len(result.note_payloads)} 个 note_payloads"
            )
            for i, np in enumerate(result.note_payloads, 1):
                log.info(f"   {i}. {np.title} ({len(np.points)} points)")

            await session.execute(
                delete(Note).where(
                    Note.raw_id == job.raw_id,
                    Note.user_id == job.user_id,
                )
            )

            # 为每个 note_payload 创建一个 Note 记录
            note_ids = []
            point_to_note_map = {}  # point_id -> note_id mapping

            for note_payload in result.note_payloads:
                note_id = str(uuid.uuid4())
                note_ids.append(note_id)

                note = Note(
                    note_id=note_id,
                    user_id=job.user_id,
                    raw_id=job.raw_id,
                    title=note_payload.title,
                    abstract=note_payload.abstract,
                    claim_type=note_payload.claim_type,
                    content_json="[]",
                )
                note.set_tags(note_payload.tags)

                points = [
                    {
                        "p_id": getattr(p, "p_id", f"p_{i}"),
                        "title": getattr(p, "title", ""),
                        "body": getattr(p, "body", ""),
                        "claim": getattr(p, "claim", ""),
                        "evidence": getattr(p, "evidence", ""),
                        "anti_patterns": getattr(p, "anti_patterns", []),
                        "hooks": getattr(p, "hooks", []),
                    }
                    for i, p in enumerate(note_payload.points)
                ]
                note.set_content_json(points)
                session.add(note)

                # 记录这个 note 中所有 point 的映射
                for p in note_payload.points:
                    point_id = getattr(p, "p_id", None)
                    if point_id:
                        point_to_note_map[point_id] = note_id

            await session.flush()

            # 创建 flashcards，使用 point_id 找到对应的 note_id
            for card in result.card_payloads:
                note_id_for_card = point_to_note_map.get(
                    card.point_id, note_ids[0] if note_ids else str(uuid.uuid4())
                )
                fc = Flashcard(
                    card_id=str(uuid.uuid4()),
                    user_id=job.user_id,
                    note_id=note_id_for_card,
                    point_id=card.point_id,
                    question=card.question,
                    answer=card.answer,
                    card_type=card.card_type,
                    explanation=card.explanation,
                    claim_ref=card.claim_ref,
                )
                session.add(fc)

            raw2.status = "processed"
            if result.meta_tag is not None:
                raw2.meta_tag_json = json.dumps(
                    result.meta_tag.model_dump(), ensure_ascii=False
                )
            else:
                raw2.meta_tag_json = None
            raw2.error_summary = None
            raw2.processed_at = datetime.now(timezone.utc)
            task2.status = "completed"
            task2.error_msg = None
            task2.note_id = (
                ",".join(note_ids) if note_ids else None
            )  # 逗号分隔的多个 note_ids
            task2.flashcard_count = len(result.card_payloads)
            task2.current_step = "done"
            task2.progress_percent = 100


async def worker_loop() -> None:
    log.info("Worker started, waiting for jobs…")
    while True:
        try:
            job = await dequeue_process_job(5)
        except Exception:
            log.exception("Dequeue error")
            await asyncio.sleep(2)
            continue
        if job is None:
            continue
        try:
            await process_job(job)
        except Exception:
            log.exception("Job failed for raw %s", job.raw_id)
            try:
                maker = get_async_session_maker()
                async with maker() as session:
                    async with session.begin():
                        stmt_r = (
                            select(RawKnowledge)
                            .where(RawKnowledge.raw_id == job.raw_id)
                            .with_for_update()
                        )
                        raw2 = (await session.execute(stmt_r)).scalar_one_or_none()
                        stmt_t = (
                            select(ProcessingTask)
                            .where(ProcessingTask.task_id == job.task_id)
                            .with_for_update()
                        )
                        task2 = (await session.execute(stmt_t)).scalar_one_or_none()
                        if raw2 and raw2.status == "processing":
                            raw2.status = "failed"
                            raw2.error_summary = "处理异常，请重试"
                        if task2:
                            task2.status = "failed"
                            task2.error_msg = "处理异常"
            except Exception:
                log.exception("Could not mark job failed")


def main() -> None:
    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()
