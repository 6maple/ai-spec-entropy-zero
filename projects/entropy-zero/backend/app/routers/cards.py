"""
Flashcards Router

Endpoints for managing flashcards and review sessions
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List
from datetime import datetime
from app.models.schemas import (
    FlashcardCreate,
    FlashcardResponse,
    ReviewRating,
    ReviewLogResponse,
)

router = APIRouter()


@router.post("/", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
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


@router.get("/", response_model=List[FlashcardResponse])
async def list_flashcards(
    note_id: str = None,
    filter: str = Query("today", regex="^(all|today|overdue)$"),
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


@router.post("/{card_id}/review", response_model=ReviewLogResponse)
async def submit_review(card_id: str, rating: ReviewRating):
    """
    Submit a review for a flashcard

    Ratings:
    1 - Again: Forgot completely
    2 - Hard: Barely remembered
    3 - Good: Correct recall
    4 - Easy: Instant recall

    TODO: Update FSRS state
    TODO: Calculate next_review date using FSRS algorithm
    TODO: Insert review log
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Review submission not yet implemented",
    )


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
