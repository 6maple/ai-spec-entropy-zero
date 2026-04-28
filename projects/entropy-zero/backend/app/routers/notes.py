"""
Notes Router

Endpoints for managing processed notes
"""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select

from app.core.deps import CurrentUserId, DbSession
from app.db.models import Flashcard, Note as NoteModel, RawKnowledge
from app.models.schemas import MetaTagResponse, NoteCreate, NoteResponse

router = APIRouter()


def _meta_from_raw_json(json_str: str | None) -> MetaTagResponse | None:
    """从原始知识库的 meta_tag_json 解析文档级语义标签。"""
    if not json_str or not json_str.strip():
        return None
    try:
        d = json.loads(json_str)
    except json.JSONDecodeError:
        return None
    if not isinstance(d, dict):
        return None
    domain = str(d.get("domain") or "").strip()
    raw_topics = d.get("topics")
    topics: list[str] = []
    if isinstance(raw_topics, list):
        topics = [str(x).strip() for x in raw_topics if str(x).strip()]
    elif isinstance(raw_topics, str) and raw_topics.strip():
        topics = [raw_topics.strip()]
    if not domain and not topics:
        return None
    return MetaTagResponse(domain=domain, topics=topics)


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
    note: NoteModel,
    *,
    flashcards_count: int = 0,
    meta_tag: MetaTagResponse | None = None,
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
        claim_type=note.claim_type,
        meta_tag=meta_tag,
    )


@router.get("/", response_model=list[NoteResponse])
async def list_notes(
    db: DbSession,
    user_id: CurrentUserId,
    tag: str | None = None,
    search: str | None = None,
    keyword: str | None = None,
    raw_id: str | None = None,
    claim_type: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    List the current user's notes. `keyword` 与 `search` 等效，均为标题/摘要/正文模糊搜索（实现可用其一）。
    """
    key = (keyword or search or "").strip() or None
    q = (
        select(NoteModel, RawKnowledge.meta_tag_json)
        .outerjoin(RawKnowledge, NoteModel.raw_id == RawKnowledge.raw_id)
        .where(NoteModel.user_id == user_id)
    )
    if raw_id:
        q = q.where(NoteModel.raw_id == raw_id)
    if claim_type and claim_type.strip():
        q = q.where(NoteModel.claim_type == claim_type.strip())
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
    return [
        _note_to_response(
            n,
            flashcards_count=0,
            meta_tag=_meta_from_raw_json(meta_json),
        )
        for n, meta_json in result.all()
    ]


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
    meta_json = None
    if note.raw_id:
        mr = await db.execute(
            select(RawKnowledge.meta_tag_json).where(
                RawKnowledge.raw_id == note.raw_id
            )
        )
        meta_json = mr.scalar_one_or_none()
    return _note_to_response(
        note,
        flashcards_count=flash_n,
        meta_tag=_meta_from_raw_json(meta_json),
    )


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
