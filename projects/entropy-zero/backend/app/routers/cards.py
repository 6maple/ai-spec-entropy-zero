"""
Flashcards Router

Endpoints for managing flashcards and review sessions
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, select

from app.core.deps import CurrentUserId, DbSession
from app.db.models import Flashcard, ReviewLog
from app.models.schemas import (
    FlashcardCreate,
    FlashcardResponse,
    FSRSState,
    ReviewLogResponse,
    ReviewRating,
    ReviewSubmitResponse,
)
from app.services.fsrs_lite import run_fsrs_lite

router = APIRouter()


def _to_card_response(row: Flashcard) -> FlashcardResponse:
    st = row.get_fsrs_state()
    return FlashcardResponse(
        card_id=row.card_id,
        user_id=row.user_id,
        note_id=row.note_id,
        point_id=row.point_id,
        question=row.question,
        answer=row.answer,
        fsrs_state=FSRSState(
            stability=float(st.get("stability", 0.0)),
            difficulty=float(st.get("difficulty", 0.0)),
            reps=int(st.get("reps", 0)),
        ),
        next_review=row.next_review,
        last_review=row.last_review,
        created_at=row.created_at,
    )


@router.get("/due", response_model=List[FlashcardResponse])
async def list_due_cards(
    db: DbSession,
    user_id: CurrentUserId,
    scope: Literal["global", "note"] = "global",
    note_id: Optional[str] = None,
    noteId: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """
    仅返回当前时刻已到期的复习卡（next_review <= 当前时间）。
    `scope=note` 时需提供 `note_id` 或 `noteId`（与前端 query 一致）。
    """
    nid = note_id or noteId
    now = datetime.now(timezone.utc)
    cond = and_(
        Flashcard.user_id == user_id,
        Flashcard.next_review <= now,
    )
    if scope == "note":
        if not nid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scope=note 时必须提供 note_id 或 noteId",
            )
        cond = and_(cond, Flashcard.note_id == nid)
    q = (
        select(Flashcard)
        .where(cond)
        .order_by(Flashcard.next_review.asc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(q)
    rows = result.scalars().all()
    return [_to_card_response(r) for r in rows]


@router.post("", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard(data: FlashcardCreate):
    """
    Create a new flashcard (usually done by AI service)

    TODO: Insert into Supabase flashcards table
    TODO: Initialize FSRS state
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Flashcard creation not yet implemented",
    )


@router.get("", response_model=List[FlashcardResponse])
async def list_flashcards(
    note_id: str = None,
    filter: str = Query("today", pattern="^(all|today|overdue)$"),
    limit: int = 100,
    offset: int = 0,
):
    """
    List flashcards for review

    Filter options:
    - today: due today or earlier
    - overdue: past due date
    - all: all flashcards

    TODO: Query Supabase with date filtering
    TODO: Order by next_review ascending
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Flashcard listing not yet implemented",
    )


@router.get("/{card_id}", response_model=FlashcardResponse)
async def get_flashcard(card_id: str):
    """
    Get a specific flashcard by ID

    TODO: Query Supabase by card_id
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Flashcard retrieval not yet implemented",
    )


@router.post("/{card_id}/review", response_model=ReviewSubmitResponse)
async def submit_review(
    card_id: str,
    data: ReviewRating,
    db: DbSession,
    user_id: CurrentUserId,
):
    """
    提交复习评分，写入 review_logs 并应用 FSRS-lite 更新下一张卡计划。
    """
    r = await db.execute(
        select(Flashcard).where(
            Flashcard.card_id == card_id, Flashcard.user_id == user_id
        )
    )
    card = r.scalar_one_or_none()
    if card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="复习卡不存在"
        )

    now = data.reviewed_at or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    st = card.get_fsrs_state()
    new_st, next_r, elapsed_days, scheduled_days = run_fsrs_lite(
        int(data.rating),
        st,
        now=now,
        last_review=card.last_review,
        created_at=card.created_at,
    )
    card.set_fsrs_state(
        {
            "stability": new_st["stability"],
            "difficulty": new_st["difficulty"],
            "reps": new_st["reps"],
        }
    )
    card.next_review = next_r
    card.last_review = now
    log = ReviewLog(
        card_id=card.card_id,
        user_id=user_id,
        rating=int(data.rating),
        elapsed_days=elapsed_days,
        scheduled_days=scheduled_days,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    await db.refresh(card)

    log_res = ReviewLogResponse(
        log_id=log.log_id,
        card_id=log.card_id,
        user_id=log.user_id,
        rating=int(log.rating),
        elapsed_days=log.elapsed_days,
        scheduled_days=log.scheduled_days,
        review_at=log.review_at,
    )
    return ReviewSubmitResponse(log=log_res, card=_to_card_response(card))


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard(card_id: str):
    """
    Delete a flashcard

    TODO: Delete from Supabase
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Flashcard deletion not yet implemented",
    )
