"""
Database initialization script

Creates all tables using SQLAlchemy ORM models
"""

import asyncio
from app.db.database import get_async_engine
from app.db.models import Base


async def init_db():
    """Initialize database tables"""
    engine = get_async_engine()

    async with engine.begin() as conn:
        # Drop all tables (for development)
        await conn.run_sync(Base.metadata.drop_all)

        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables created successfully")


if __name__ == "__main__":
    asyncio.run(init_db())
