"""
Pydantic models for API request/response schemas
"""

from typing import List, Optional, Literal
from pydantic import BaseModel
from datetime import datetime


# ===== Raw Knowledge =====
class RawKnowledgeCreate(BaseModel):
    file_name: str
    content: str


class RawKnowledgeResponse(BaseModel):
    raw_id: str
    user_id: str
    file_name: str
    content: str
    status: Literal["pending", "processing", "processed", "failed"]
    created_at: datetime
    updated_at: datetime


# ===== Notes =====
class Point(BaseModel):
    p_id: str
    title: str
    body: str


class NoteCreate(BaseModel):
    raw_id: str
    title: str
    abstract: str
    tags: List[str]
    content_json: List[Point]


class NoteResponse(BaseModel):
    note_id: str
    user_id: str
    raw_id: str
    title: str
    abstract: str
    tags: List[str]
    content_json: List[Point]
    created_at: datetime


# ===== Flashcards =====
class FSRSState(BaseModel):
    stability: float
    difficulty: float
    reps: int


class FlashcardCreate(BaseModel):
    note_id: str
    point_id: str
    question: str
    answer: str


class FlashcardResponse(BaseModel):
    card_id: str
    user_id: str
    note_id: str
    point_id: str
    question: str
    answer: str
    fsrs_state: FSRSState
    next_review: datetime
    last_review: Optional[datetime]
    created_at: datetime


class ReviewRating(BaseModel):
    rating: Literal[1, 2, 3, 4]  # Again, Hard, Good, Easy


class ReviewLogResponse(BaseModel):
    log_id: int
    card_id: str
    user_id: str
    rating: int
    elapsed_days: int
    scheduled_days: int
    review_at: datetime
