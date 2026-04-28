"""
数据库与 Supabase。

按官方说明，[`supabase-py`](https://supabase.com/docs/reference/python/introduction) 通过 **Data API** 访问项目数据时，
使用 `create_client(project_url, api_key)` 即可——**不涉及单独配置 Postgres 密码类环境变量**，密钥即 `SUPABASE_SECRET_KEY`。

本仓库中与 **Wire 直连** 相关的 **SQLAlchemy**（asyncpg/sqlite）**仅**读取环境变量 **`DATABASE_URL`**（若调用 ORM、Worker、`init_db`）。二者职责不同：`DATABASE_URL` 不是 Supabase Python 客户端的官方必填项，而是本项目中「直连数据库」这一条链路的配置。

参阅：
- Introduction：https://supabase.com/docs/reference/python/introduction
- 直连 Postgres 连接串（选用 ORM 时）：https://supabase.com/docs/guides/database/connecting-to-postgres
"""

from __future__ import annotations

import logging
import os
import re
import ssl
from pathlib import Path
from urllib.parse import urlparse, urlunparse, urlencode, parse_qs

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

log = logging.getLogger("entropy.db")

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv(Path(__file__).resolve().parents[2] / ".env.local", override=True)

from app.db.supabase_env import (
    is_supabase_rest_configured,
    resolve_supabase_project_url,
    resolve_supabase_secret_key,
)

_async_engine = None
_async_session_maker = None
_supabase_client = None


def normalize_database_url(url: str) -> str:
    # 支持多种 postgres URL 前缀：
    # - 将 legacy `postgres://` -> `postgresql+asyncpg://`
    # - 将 `postgresql://`（但未指定 asyncpg） -> `postgresql+asyncpg://`
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _strip_asyncpg_unsupported_params(url: str) -> tuple[str, dict]:
    """从 URL 中移除 asyncpg 不支持的 query 参数，返回 (清理后 URL, connect_args)。

    - sslmode=require/verify-full → connect_args["ssl"] = True
    - supa=base-pooler.x → 移除（Supabase PgBouncer 内部标记，asyncpg 不识别）
    - pgbouncer=true → 移除（pgBouncer 标记，asyncpg 不识别）
    """
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)

    ssl_mode = (params.pop("sslmode", [None])[0] or "").lower()
    params.pop("supa", None)
    params.pop("pgbouncer", None)

    connect_args: dict = {}
    if ssl_mode in ("require", "allow", "prefer"):
        # Supabase PgBouncer 使用自签名证书，需要创建不验证证书的 SSL context
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx
    elif ssl_mode in ("verify-full", "verify-ca"):
        connect_args["ssl"] = True

    # pgBouncer 事务模式（port 6543）下需禁用 prepared statement 缓存
    if parsed.port == 6543:
        connect_args["prepared_statement_cache_size"] = 0  # SQLAlchemy asyncpg 层缓存
        connect_args["statement_cache_size"] = 0  # asyncpg 自身内部缓存

    new_query = urlencode({k: v[0] for k, v in params.items()})
    cleaned_url = urlunparse(parsed._replace(query=new_query))
    return cleaned_url, connect_args


def _effective_database_url() -> tuple[str | None, str]:
    # 优先使用 SUPABASE_POSTGRES_URL（用于 Supabase 托管 Postgres 的直接连接串），
    # 其次使用通用的 DATABASE_URL。
    supa = os.getenv("SUPABASE_POSTGRES_URL", "").strip()
    if supa:
        return normalize_database_url(supa), "SUPABASE_POSTGRES_URL"
    explicit = os.getenv("DATABASE_URL", "").strip()
    if explicit:
        return normalize_database_url(explicit), "DATABASE_URL"
    return None, ""


def get_effective_database_url() -> str | None:
    """当前是否配置了 SQLAlchemy 使用的 DATABASE_URL。"""
    u, _ = _effective_database_url()
    return u


def _mask_url_for_log(url: str) -> str:
    try:
        return re.sub(r"(://[^:]+:)([^@]+)(@)", r"\1***\3", url, count=1)
    except Exception:
        return "(configured)"


def _sqlalchemy_missing_message() -> str:
    lines = [
        "本项目 SQLAlchemy / Worker / init_db 需要 **DATABASE_URL**（sqlite 或 postgresql 连接串）。\n",
        "Supabase **Python Data API** 仅需 **SUPABASE_URL** + Secret，见文档：",
        "https://supabase.com/docs/reference/python/introduction\n",
    ]
    if is_supabase_rest_configured():
        lines.append(
            "你已配置 SUPABASE_URL + SUPABASE_SECRET_KEY：官方客户端可在无 DATABASE_URL 时使用；"
            "若当前代码路径仍调用 SQLAlchemy，请在 .env.local 增加 DATABASE_URL。\n"
            "本地可选：`DATABASE_URL=sqlite+aiosqlite:///./entropy_zero.db`；"
            "连托管 Postgres 请用 Dashboard → Connect 的 URI，`postgresql://`→`postgresql+asyncpg://`。\n"
        )
    elif (
        os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_JWT_SECRET")
    ) and not (os.getenv("SUPABASE_URL") or "").strip():
        lines.append(
            "检测到部分 SUPABASE_* 但未设置 **SUPABASE_URL**（形如 https://xxx.supabase.co）。\n"
        )
    return "".join(lines)


def get_async_engine():
    global _async_engine
    if _async_engine is None:
        raw, src = _effective_database_url()
        if not raw:
            raise ValueError(_sqlalchemy_missing_message())
        cleaned_url, connect_args = _strip_asyncpg_unsupported_params(raw)
        log.info("SQLAlchemy 数据源: %s %s", src, _mask_url_for_log(cleaned_url))
        is_pgbouncer = connect_args.get("prepared_statement_cache_size") == 0
        _async_engine = create_async_engine(
            cleaned_url,
            echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes"),
            future=True,
            connect_args=connect_args,
            pool_pre_ping=True,
            # pgBouncer 事务模式下禁用 SQLAlchemy 查询级别 prepared statement 缓存
            query_cache_size=0 if is_pgbouncer else 100,
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
    """
    Data API：`create_client` 仅需 SUPABASE_URL + SUPABASE_SECRET_KEY（与官方 Introduction 一致）。
    """
    global _supabase_client
    if _supabase_client is None:
        url = resolve_supabase_project_url()
        key = resolve_supabase_secret_key()
        if not url or not key:
            raise ValueError(
                "须配置 SUPABASE_URL 与 SUPABASE_SECRET_KEY（见 Supabase Python 文档 Introduction）。"
            )
        from supabase import create_client

        _supabase_client = create_client(url, key)
    return _supabase_client


u_boot, src_boot = _effective_database_url()
if u_boot:
    print(
        f"[db] SQLAlchemy DATABASE_URL 已配置: {src_boot} {_mask_url_for_log(u_boot)}"
    )
elif is_supabase_rest_configured():
    print(
        "[db] SUPABASE_URL + SUPABASE_SECRET_KEY 已就绪（Data API）；"
        "SQLAlchemy 仍依赖 DATABASE_URL，未设置时需在 .env.local 补充（参见 database 模块注释）。"
    )
else:
    print(
        "[db] 未配置 DATABASE_URL，且未完成 SUPABASE_URL + SUPABASE_SECRET_KEY；见 backend/.env.example。"
    )

supabase = None
