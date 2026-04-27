"""
Notes Router

Endpoints for managing processed notes
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.core.deps import CurrentUserId, DbSession
from app.db.models import Flashcard, Note as NoteModel
from app.models.schemas import NoteCreate, NoteResponse

router = APIRouter()


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(data: NoteCreate):
    """
    Create a new note (usually done by AI service)

    TODO: Insert into database
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note creation not yet implemented",
    )


def _note_to_response(
    note: NoteModel, *, flashcards_count: int = 0
) -> NoteResponse:
    return NoteResponse(
        note_id=note.note_id,
        user_id=note.user_id,
        raw_id=note.raw_id or "",
        title=note.title,
        abstract=note.abstract or "",
        tags=note.get_tags(),
        content_json=note.get_content_json(),
        created_at=note.created_at,
        flashcards_count=flashcards_count,
    )


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    db: DbSession,
    user_id: CurrentUserId,
    tag: str | None = None,
    search: str | None = None,
    keyword: str | None = None,
    raw_id: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List the current user's notes. `keyword` 与 `search` 等效，均为标题/摘要/正文模糊搜索（实现可用其一）。
    """
    key = (keyword or search or "").strip() or None
    q = select(NoteModel).where(NoteModel.user_id == user_id)
    if raw_id:
        q = q.where(NoteModel.raw_id == raw_id)
    if tag and tag.strip():
        t = tag.strip()
        # tags 为 JSON 数组字符串/JSONB，用子串匹配兼容两种存储
        q = q.where(NoteModel.tags.like(f'%"{t}"%'))
    if key:
        like = f"%{key}%"
        q = q.where(
            or_(
                NoteModel.title.ilike(like),
                NoteModel.abstract.ilike(like),
                NoteModel.content_json.ilike(like),
            )
        )
    q = q.limit(limit).offset(offset).order_by(NoteModel.created_at.desc())
    result = await db.execute(q)
    notes = result.scalars().all()
    return [_note_to_response(n, flashcards_count=0) for n in notes]


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, db: DbSession, user_id: CurrentUserId):
    """按 ID 获取笔记并返回关联复习卡数量。"""
    r = await db.execute(
        select(NoteModel).where(
            NoteModel.note_id == note_id, NoteModel.user_id == user_id
        )
    )
    note = r.scalar_one_or_none()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="笔记不存在"
        )
    c = await db.execute(
        select(func.count())
        .select_from(Flashcard)
        .where(Flashcard.note_id == note_id, Flashcard.user_id == user_id)
    )
    flash_n = int(c.scalar_one() or 0)
    return _note_to_response(note, flashcards_count=flash_n)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, data: NoteCreate):
    """
    Update a note (manual editing)

    TODO: Update Supabase record
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note update not yet implemented",
    )


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str):
    """
    Delete a note

    TODO: Delete from Supabase (will cascade to flashcards)
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note deletion not yet implemented",
    )
