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
    error_summary: Optional[str] = None
    processed_at: Optional[datetime] = None


class RawKnowledgeUploadResponse(BaseModel):
    raw_id: str
    status: Literal["pending"]
    created_at: datetime


class RawKnowledgeListItem(BaseModel):
    raw_id: str
    user_id: str
    file_name: str
    status: Literal["pending", "processing", "processed", "failed"]
    created_at: datetime
    updated_at: datetime
    error_summary: Optional[str] = None
    processed_at: Optional[datetime] = None


class RawKnowledgeDetailResponse(BaseModel):
    raw_id: str
    user_id: str
    file_name: str
    content: str
    status: Literal["pending", "processing", "processed", "failed"]
    created_at: datetime
    updated_at: datetime
    error_summary: Optional[str] = None
    processed_at: Optional[datetime] = None
    notes_count: int = 0
    flashcards_count: int = 0


class ProcessRawRequest(BaseModel):
    force_retry: bool = False


class ProcessRawResponse(BaseModel):
    raw_id: str
    status: Literal["processing"]
    task_id: str
    message: str


# ===== Tasks =====
class TaskListItem(BaseModel):
    task_id: str
    raw_id: str
    task_type: str
    status: Literal["queued", "processing", "completed", "failed"]
    current_step: Optional[str]
    progress_percent: int
    error_msg: Optional[str]
    result_summary: Optional[str]
    created_at: datetime


class TaskDetailResponse(BaseModel):
    task_id: str
    raw_id: str
    current_step: Optional[str]
    progress_percent: int
    status: Literal["queued", "processing", "completed", "failed"]
    error_msg: Optional[str]
    note_id: Optional[str]
    flashcard_count: Optional[int]


# ===== Notes =====
class MetaTagResponse(BaseModel):
    domain: str = ""
    topics: List[str] = []


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
    flashcards_count: int = 0
    claim_type: str | None = None
    meta_tag: Optional[MetaTagResponse] = None


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
    reviewed_at: Optional[datetime] = None


class ReviewLogResponse(BaseModel):
    log_id: int
    card_id: str
    user_id: str
    rating: int
    elapsed_days: int
    scheduled_days: int
    review_at: datetime


class ReviewSubmitResponse(BaseModel):
    log: ReviewLogResponse
    card: FlashcardResponse
