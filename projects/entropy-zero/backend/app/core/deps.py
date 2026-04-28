"""FastAPI dependencies: auth, database session."""

import logging
import os
from typing import Annotated, AsyncGenerator, Literal, Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_async_session_maker

log = logging.getLogger("entropy.auth")


def _auth_mode() -> Literal["supabase", "dev_token"]:
    raw = (os.getenv("AUTH_MODE") or "supabase").strip().lower()
    return "dev_token" if raw == "dev_token" else "supabase"


def _jwt_secret() -> Optional[str]:
    """按 AUTH_MODE 选择密钥；dev_token 模式使用 DEV_JWT_SECRET。"""
    if _auth_mode() == "dev_token":
        return os.getenv("DEV_JWT_SECRET")
    return os.getenv("SUPABASE_JWT_SECRET") or os.getenv("DEV_JWT_SECRET")


def _supabase_jwks_url() -> Optional[str]:
    url = (os.getenv("SUPABASE_JWKS_URL") or "").strip()
    if url:
        return url
    base = (os.getenv("SUPABASE_URL") or "").strip()
    if not base:
        return None
    # Supabase Auth JWKS 默认地址
    return base.rstrip("/") + "/auth/v1/.well-known/jwks.json"


def _describe_secret_source() -> str:
    if _auth_mode() == "dev_token":
        return "DEV_JWT_SECRET" if os.getenv("DEV_JWT_SECRET") else "(未设置)"
    if os.getenv("SUPABASE_JWT_SECRET"):
        return "SUPABASE_JWT_SECRET"
    if os.getenv("DEV_JWT_SECRET"):
        return "DEV_JWT_SECRET(兼容)"
    return "(未设置)"


_logged_auth = False
_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = _supabase_jwks_url()
        if not url:
            raise ValueError(
                "SUPABASE_URL 或 SUPABASE_JWKS_URL 未配置，无法获取 Supabase JWKS"
            )
        _jwks_client = PyJWKClient(url)
    return _jwks_client


def _log_auth_once() -> None:
    global _logged_auth
    if _logged_auth:
        return
    _logged_auth = True
    log.info(
        "鉴权：AUTH_MODE=%s JWT 密钥字段=%s SUPABASE_JWKS_URL=%s",
        _auth_mode(),
        _describe_secret_source(),
        _supabase_jwks_url() or "(未配置)",
    )


_log_auth_once()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    maker = get_async_session_maker()
    async with maker() as session:
        yield session


async def get_current_user_id(
    authorization: Annotated[Optional[str], Header()] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        log.debug("Authorization header missing or invalid: %s", bool(authorization))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少或无效的 Authorization 头",
        )
    token = authorization.removeprefix("Bearer ").strip()

    # 记录 token 长度（非敏感），帮助判断 header 是否到达后端
    try:
        log.debug("Received Authorization token length=%d", len(token))
    except Exception:
        log.debug("Received Authorization token (length unknown)")

    secret = _jwt_secret()
    mode = _auth_mode()
    if mode == "dev_token":
        if not secret:
            log.error("JWT secret missing for dev_token mode")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="服务器未配置 DEV_JWT_SECRET（AUTH_MODE=dev_token）",
            )
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError as e:
            log.exception("JWT decode failed (dev_token): %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌无效或已过期",
            ) from None
    else:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        if alg == "HS256" and secret:
            # 兼容本地 SUPABASE_JWT_SECRET 或 DEV_JWT_SECRET
            key = secret
        else:
            try:
                key = _get_jwks_client().get_signing_key_from_jwt(token).key
            except Exception as e:
                log.exception(
                    "Failed to fetch Supabase JWKS or signing key: %s", type(e).__name__
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="无法验证 Supabase token，请检查 SUPABASE_URL/SUPABASE_JWKS_URL 配置",
                ) from None
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["HS256", "RS256", "ES256"],
                audience="authenticated",
            )
        except jwt.PyJWTError as e:
            log.exception("JWT decode failed (supabase): %s", type(e).__name__)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="令牌无效或已过期",
            ) from None
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise ValueError("missing sub")
    return sub


DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUserId = Annotated[str, Depends(get_current_user_id)]
