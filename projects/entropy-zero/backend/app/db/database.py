"""
Database connection module

Supports:
1. Local Development: SQLite (aiosqlite) or PostgreSQL (asyncpg)
2. Production: Supabase via DATABASE_URL or service layer
"""

import os
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

USE_LOCAL_DB = bool(DATABASE_URL)

_async_engine = None
_async_session_maker = None
_supabase_client = None


def normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def get_async_engine():
    global _async_engine
    if _async_engine is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL must be set for local development")
        normalized = normalize_database_url(DATABASE_URL)
        _async_engine = create_async_engine(
            normalized,
            echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes"),
            future=True,
        )
    return _async_engine


def get_async_session_maker():
    global _async_session_maker
    if _async_session_maker is None:
        engine = get_async_engine()
        _async_session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_maker


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set for Supabase mode"
            )
        from supabase import create_client

        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client


if USE_LOCAL_DB:
    print(f"[db] Using LOCAL database: {normalize_database_url(DATABASE_URL)}")
    supabase = None
else:
    print("[db] Using SUPABASE database")
    supabase = get_supabase_client()
