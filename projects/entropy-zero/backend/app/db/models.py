"""
SQLAlchemy ORM Models for Entropy Zero

Defines database tables that match the PostgreSQL schema in migrations/001_init.sql
"""

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Integer,
    SmallInteger,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid
import json

Base = declarative_base()

# UUID 列类型：PostgreSQL 用原生 UUID 类型（避免 uuid = varchar 类型错误），Python 侧用字符串
_UUID = PG_UUID(as_uuid=False)


class RawKnowledge(Base):
    __tablename__ = "raw_knowledge"

    raw_id = Column(_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(_UUID, nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    error_summary = Column(Text, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    meta_tag_json = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_raw_knowledge_user_id", "user_id"),
        Index("idx_raw_knowledge_status", "status"),
        Index("idx_raw_knowledge_user_created", "user_id", "created_at"),
        Index(
            "idx_raw_knowledge_user_status_created", "user_id", "status", "created_at"
        ),
    )


class ProcessingTask(Base):
    """Observability row for process jobs; status MUST stay aligned with raw_knowledge in the same transaction."""

    __tablename__ = "processing_tasks"

    task_id = Column(_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(_UUID, nullable=False, index=True)
    raw_id = Column(
        _UUID,
        ForeignKey("raw_knowledge.raw_id", ondelete="CASCADE"),
        nullable=False,
    )
    task_type = Column(String(64), nullable=False, default="entropy_deconstruction")
    status = Column(String(20), nullable=False)
    current_step = Column(String(64), nullable=True)
    progress_percent = Column(Integer, nullable=False, default=0)
    error_msg = Column(Text, nullable=True)
    note_id = Column(_UUID, nullable=True)
    flashcard_count = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_processing_tasks_user_created", "user_id", "created_at"),
        Index("idx_processing_tasks_raw_id", "raw_id"),
        Index("idx_processing_tasks_status", "status"),
    )


class Note(Base):
    __tablename__ = "notes"

    note_id = Column(_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(_UUID, nullable=False, index=True)
    raw_id = Column(
        _UUID, ForeignKey("raw_knowledge.raw_id", ondelete="SET NULL"), nullable=True
    )
    title = Column(String(500), nullable=False)
    abstract = Column(Text)
    tags = Column(Text, default="[]")  # JSON string for SQLite compatibility
    claim_type = Column(String(128), nullable=True)
    content_json = Column(Text, nullable=False)  # JSON string for SQLite compatibility
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("idx_notes_user_id", "user_id"),
        Index("idx_notes_raw_id", "raw_id"),
        Index("idx_notes_user_created", "user_id", "created_at"),
        Index("idx_notes_user_claim_type", "user_id", "claim_type"),
    )

    def get_tags(self):
        """Parse tags JSON string"""
        return json.loads(self.tags) if self.tags else []

    def set_tags(self, tags_list):
        """Set tags from list"""
        self.tags = json.dumps(tags_list)

    def get_content_json(self):
        """Parse content_json string"""
        return json.loads(self.content_json)

    def set_content_json(self, content_list):
        """Set content_json from list"""
        self.content_json = json.dumps(content_list)


class Flashcard(Base):
    __tablename__ = "flashcards"

    card_id = Column(_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(_UUID, nullable=False, index=True)
    note_id = Column(
        _UUID, ForeignKey("notes.note_id", ondelete="CASCADE"), nullable=False
    )
    point_id = Column(String(100), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    card_type = Column(String(20), nullable=False, default="qa")
    explanation = Column(Text, nullable=True)
    claim_ref = Column(String(100), nullable=True)
    fsrs_state = Column(
        Text, nullable=False, default='{"stability": 0.0, "difficulty": 0.0, "reps": 0}'
    )
    next_review = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_review = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("idx_flashcards_user_id", "user_id"),
        Index("idx_flashcards_note_id", "note_id"),
        Index("idx_flashcards_next_review", "next_review"),
        Index("idx_flashcards_user_next_review", "user_id", "next_review"),
        Index("idx_flashcards_claim_ref", "claim_ref"),
    )

    def get_fsrs_state(self):
        """Parse FSRS state JSON string"""
        return json.loads(self.fsrs_state)

    def set_fsrs_state(self, state_dict):
        """Set FSRS state from dict"""
        self.fsrs_state = json.dumps(state_dict)


class ReviewLog(Base):
    __tablename__ = "review_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    card_id = Column(
        _UUID, ForeignKey("flashcards.card_id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(_UUID, nullable=False, index=True)
    rating = Column(SmallInteger, nullable=False)
    elapsed_days = Column(Integer, nullable=False)
    scheduled_days = Column(Integer, nullable=False)
    review_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("idx_review_logs_card_id", "card_id"),
        Index("idx_review_logs_user_id", "user_id"),
        Index("idx_review_logs_review_at", "review_at"),
    )
