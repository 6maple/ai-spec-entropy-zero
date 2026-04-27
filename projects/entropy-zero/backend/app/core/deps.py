"""FastAPI dependencies: auth, database session."""

import os
from typing import Annotated, AsyncGenerator, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_async_session_maker


def _jwt_secret() -> Optional[str]:
    return os.getenv("SUPABASE_JWT_SECRET") or os.getenv("DEV_JWT_SECRET")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    maker = get_async_session_maker()
    async with maker() as session:
        yield session


async def get_current_user_id(
    authorization: Annotated[Optional[str], Header()] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少或无效的 Authorization 头",
        )
    token = authorization.removeprefix("Bearer ").strip()
    secret = _jwt_secret()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器未配置 SUPABASE_JWT_SECRET 或 DEV_JWT_SECRET",
        )
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str):
            raise ValueError("missing sub")
        return sub
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌无效或已过期",
        ) from None


DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
