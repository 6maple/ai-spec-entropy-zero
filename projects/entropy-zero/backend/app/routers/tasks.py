"""Task observability API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.core.deps import CurrentUserId, DbSession
from app.db.models import ProcessingTask
from app.models.schemas import TaskDetailResponse, TaskListItem

router = APIRouter()


def _summary(task: ProcessingTask) -> str | None:
    if task.status != "completed":
        return None
    parts = []
    if task.note_id:
        parts.append(f"note_id={task.note_id}")
    if task.flashcard_count is not None:
        parts.append(f"flashcard_count={task.flashcard_count}")
    return ";".join(parts) if parts else None


@router.get("", response_model=list[TaskListItem])
async def list_tasks(
    db: DbSession,
    user_id: CurrentUserId,
    status_filter: str | None = Query(None, alias="status"),
    raw_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at_desc"),
):
    allowed = ("queued", "processing", "completed", "failed")
    if status_filter and status_filter not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的 status 参数",
        )
    q = select(ProcessingTask).where(ProcessingTask.user_id == user_id)
    if status_filter:
        q = q.where(ProcessingTask.status == status_filter)
    if raw_id:
        q = q.where(ProcessingTask.raw_id == raw_id)
    if sort == "created_at_desc":
        q = q.order_by(ProcessingTask.created_at.desc())
    else:
        q = q.order_by(ProcessingTask.created_at.asc())
    offset = (page - 1) * page_size
    q = q.offset(offset).limit(page_size)
    rows = (await db.execute(q)).scalars().all()
    return [
        TaskListItem(
            task_id=t.task_id,
            raw_id=t.raw_id,
            task_type=t.task_type,
            status=t.status,
            current_step=t.current_step,
            progress_percent=t.progress_percent,
            error_msg=t.error_msg,
            result_summary=_summary(t),
            created_at=t.created_at,
        )
        for t in rows
    ]


@router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(
    task_id: str,
    db: DbSession,
    user_id: CurrentUserId,
):
    t = await db.get(ProcessingTask, task_id)
    if not t or t.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到")
    return TaskDetailResponse(
        task_id=t.task_id,
        raw_id=t.raw_id,
        current_step=t.current_step,
        progress_percent=t.progress_percent,
        status=t.status,
        error_msg=t.error_msg,
        note_id=t.note_id,
        flashcard_count=t.flashcard_count,
    )
