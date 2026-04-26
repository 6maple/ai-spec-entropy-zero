"""
Notes Router

Endpoints for managing processed notes
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.schemas import NoteCreate, NoteResponse
from app.db.database import get_db_session, USE_LOCAL_DB
from app.db.models import Note as NoteModel

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


@router.get("/", response_model=List[NoteResponse])
async def list_notes(
    tag: str = None,
    search: str = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db_session) if USE_LOCAL_DB else None,
):
    """
    List all notes with optional filters

    TODO: Support tag filtering and text search
    """
    if not USE_LOCAL_DB:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Note listing not yet implemented for Supabase mode",
        )

    # Query database
    query = (
        select(NoteModel)
        .limit(limit)
        .offset(offset)
        .order_by(NoteModel.created_at.desc())
    )
    result = await db.execute(query)
    notes = result.scalars().all()

    # Convert to response models
    return [
        NoteResponse(
            note_id=note.note_id,
            user_id=note.user_id,
            raw_id=note.raw_id or "",
            title=note.title,
            abstract=note.abstract or "",
            tags=note.get_tags(),
            content_json=note.get_content_json(),
            created_at=note.created_at,
        )
        for note in notes
    ]


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """
    Get a specific note by ID

    TODO: Query Supabase by note_id
    TODO: Include associated flashcards count
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Note retrieval not yet implemented",
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
