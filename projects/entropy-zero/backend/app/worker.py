"""Standalone worker: dequeue → deterministic processor → persist notes/cards."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select

from app.db.database import get_async_session_maker
from app.db.models import Flashcard, Note, ProcessingTask, RawKnowledge
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

        inp = ProcessorInput(
            raw_id=raw.raw_id,
            user_id=raw.user_id,
            content=raw.content,
            file_name=raw.file_name,
        )
        result = run_deterministic_processor(inp)

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
            await session.execute(
                delete(Note).where(
                    Note.raw_id == job.raw_id,
                    Note.user_id == job.user_id,
                )
            )
            note_id = str(uuid.uuid4())
            note = Note(
                note_id=note_id,
                user_id=job.user_id,
                raw_id=job.raw_id,
                title=result.note_payload.title,
                abstract=result.note_payload.abstract,
                content_json="[]",
            )
            note.set_tags(result.note_payload.tags)
            points = [
                {
                    "p_id": p.get("p_id", f"p_{i}"),
                    "title": p.get("title", ""),
                    "body": p.get("body", ""),
                }
                for i, p in enumerate(result.note_payload.points)
            ]
            note.set_content_json(points)
            session.add(note)
            await session.flush()

            for card in result.card_payloads:
                fc = Flashcard(
                    card_id=str(uuid.uuid4()),
                    user_id=job.user_id,
                    note_id=note_id,
                    point_id=card.point_id,
                    question=card.question,
                    answer=card.answer,
                )
                session.add(fc)

            raw2.status = "processed"
            raw2.error_summary = None
            raw2.processed_at = datetime.now(timezone.utc)
            task2.status = "completed"
            task2.current_step = "done"
            task2.progress_percent = 100
            task2.error_msg = None
            task2.note_id = note_id
            task2.flashcard_count = len(result.card_payloads)


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
