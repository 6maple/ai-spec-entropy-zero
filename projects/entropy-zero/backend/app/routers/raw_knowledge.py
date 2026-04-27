"""
Raw Knowledge Router: multipart Markdown upload, list, detail, process trigger.
"""

from __future__ import annotations

import os
import re
import uuid

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select

from app.core.config import get_max_md_upload_bytes
from app.core.deps import CurrentUserId, DbSession
from app.db.models import Flashcard, Note, ProcessingTask, RawKnowledge
from app.models.schemas import (
    ProcessRawRequest,
    ProcessRawResponse,
    RawKnowledgeDetailResponse,
    RawKnowledgeListItem,
    RawKnowledgeUploadResponse,
)
from app.services.queue_service import ProcessJobPayload, enqueue_process_job

router = APIRouter()

_MD_SUFFIX = ".md"


def _safe_file_name(name: str) -> str:
    base = os.path.basename((name or "").strip())
    base = re.sub(r"[^\w\-. \u4e00-\u9fff]", "_", base).strip("._")
    if not base:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的文件名",
        )
    if len(base) > 255:
        base = base[:255]
    if not base.lower().endswith(_MD_SUFFIX):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仅支持 .md 文件",
        )
    return base


@router.post(
    "/upload",
    response_model=RawKnowledgeUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_raw_markdown(
    db: DbSession,
    user_id: CurrentUserId,
    file: UploadFile = File(..., description="Markdown 文件"),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="缺少上传文件",
        )
    safe_name = _safe_file_name(file.filename)
    max_b = get_max_md_upload_bytes()
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件为空",
        )
    if len(raw_bytes) > max_b:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"文件超过大小限制（最大 {max_b} 字节）",
        )
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件须为 UTF-8 编码的 Markdown",
        ) from err

    rid = str(uuid.uuid4())
    row = RawKnowledge(
        raw_id=rid,
        user_id=user_id,
        file_name=safe_name,
        content=text,
        status="pending",
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return RawKnowledgeUploadResponse(
        raw_id=row.raw_id,
        status="pending",
        created_at=row.created_at,
    )


@router.get("/", response_model=list[RawKnowledgeListItem])
async def list_raw_knowledge(
    db: DbSession,
    user_id: CurrentUserId,
    status_filter: str | None = Query(None, alias="status"),
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    q = select(RawKnowledge).where(RawKnowledge.user_id == user_id)
    allowed = ("pending", "processing", "processed", "failed")
    if status_filter:
        if status_filter not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的 status 参数",
            )
        q = q.where(RawKnowledge.status == status_filter)
    if keyword:
        kw = f"%{keyword}%"
        q = q.where(
            or_(
                RawKnowledge.file_name.ilike(kw),
                RawKnowledge.content.ilike(kw),
            )
        )
    q = q.order_by(RawKnowledge.created_at.desc())
    offset = (page - 1) * page_size
    q = q.offset(offset).limit(page_size)
    result = await db.execute(q)
    rows = result.scalars().all()
    return [
        RawKnowledgeListItem(
            raw_id=r.raw_id,
            user_id=r.user_id,
            file_name=r.file_name,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at,
            error_summary=r.error_summary,
            processed_at=r.processed_at,
        )
        for r in rows
    ]


@router.get("/{raw_id}", response_model=RawKnowledgeDetailResponse)
async def get_raw_knowledge(
    raw_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    row = await db.get(RawKnowledge, raw_id)
    if not row or row.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到")
    notes_cnt = await db.scalar(
        select(func.count())
        .select_from(Note)
        .where(Note.raw_id == raw_id, Note.user_id == user_id)
    )
    cards_cnt = await db.scalar(
        select(func.count())
        .select_from(Flashcard)
        .join(Note, Flashcard.note_id == Note.note_id)
        .where(Note.raw_id == raw_id, Note.user_id == user_id)
    )
    return RawKnowledgeDetailResponse(
        raw_id=row.raw_id,
        user_id=row.user_id,
        file_name=row.file_name,
        content=row.content,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        error_summary=row.error_summary,
        processed_at=row.processed_at,
        notes_count=int(notes_cnt or 0),
        flashcards_count=int(cards_cnt or 0),
    )


@router.post(
    "/{raw_id}/process",
    response_model=ProcessRawResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_processing(
    raw_id: str,
    db: DbSession,
    user_id: CurrentUserId,
    body: ProcessRawRequest | None = None,
):
    _ = body
    task_id_str: str
    async with db.begin():
        stmt = (
            select(RawKnowledge)
            .where(RawKnowledge.raw_id == raw_id)
            .with_for_update()
        )
        row = (await db.execute(stmt)).scalar_one_or_none()
        if not row or row.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到")
        if row.status == "processing":
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="任务已在处理中",
            )
        if row.status == "processed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="当前状态不允许触发处理",
            )
        if row.status not in ("pending", "failed"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="当前状态不允许触发处理",
            )

        task = ProcessingTask(
            user_id=user_id,
            raw_id=raw_id,
            task_type="entropy_deconstruction",
            status="queued",
            current_step="queued",
            progress_percent=0,
        )
        db.add(task)
        await db.flush()
        task_id_str = task.task_id
        row.status = "processing"
        row.error_summary = None
        await db.flush()

    try:
        await enqueue_process_job(
            ProcessJobPayload(
                task_id=task_id_str,
                raw_id=raw_id,
                user_id=user_id,
            )
        )
    except Exception:
        async with db.begin():
            stmt_r = (
                select(RawKnowledge)
                .where(RawKnowledge.raw_id == raw_id)
                .with_for_update()
            )
            r2 = (await db.execute(stmt_r)).scalar_one_or_none()
            stmt_t = (
                select(ProcessingTask)
                .where(ProcessingTask.task_id == task_id_str)
                .with_for_update()
            )
            t2 = (await db.execute(stmt_t)).scalar_one_or_none()
            if r2 and r2.status == "processing":
                r2.status = "failed"
                r2.error_summary = "入队失败，请稍后重试"
            if t2:
                t2.status = "failed"
                t2.error_msg = "入队失败"
        raise

    return ProcessRawResponse(
        raw_id=raw_id,
        status="processing",
        task_id=task_id_str,
        message="processing accepted",
    )


@router.delete("/{raw_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_raw_knowledge(raw_id: str):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="删除原始知识暂未实现",
    )
