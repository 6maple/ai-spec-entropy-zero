"""
Database connection module

Supports two modes:
1. Local Development: SQLite (file-based, no installation needed)
2. Production: Supabase
"""

import os
from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Environment detection
DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Determine which database mode to use
USE_LOCAL_DB = bool(DATABASE_URL)

# Lazy-loaded clients
_async_engine = None
_async_session_maker = None
_supabase_client = None


def get_async_engine():
    """Get SQLAlchemy async engine for local development"""
    global _async_engine
    if _async_engine is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL must be set for local development")

        _async_engine = create_async_engine(
            DATABASE_URL,
            echo=True,  # Log SQL queries
            future=True,
        )
    return _async_engine


def get_async_session_maker():
    """Get async session maker"""
    global _async_session_maker
    if _async_session_maker is None:
        engine = get_async_engine()
        _async_session_maker = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _async_session_maker


async def get_db_session():
    """Get database session"""
    session_maker = get_async_session_maker()
    async with session_maker() as session:
        yield session


def get_supabase_client():
    """Get Supabase client for production"""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set for Supabase mode"
            )

        from supabase import create_client

        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase_client


# Export the appropriate client
if USE_LOCAL_DB:
    print(f"🔧 Using LOCAL database: {DATABASE_URL}")
    supabase = None  # Not used in local mode
else:
    print("☁️ Using SUPABASE database")
    supabase = get_supabase_client()
