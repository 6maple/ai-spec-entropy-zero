"""Supabase 项目 URL 与「服务端 Secret」密钥（仅用 SUPABASE_SECRET_KEY）。"""

from __future__ import annotations

import os


def resolve_supabase_project_url() -> str:
    return (os.getenv("SUPABASE_URL") or "").strip()


def resolve_supabase_secret_key() -> str:
    """Dashboard → API Keys → Secret（或 legacy service_role）；环境变量固定为 SUPABASE_SECRET_KEY。"""
    return (os.getenv("SUPABASE_SECRET_KEY") or "").strip()


def is_supabase_rest_configured() -> bool:
    """与官方文档一致：`create_client(SUPABASE_URL, key)` Data API 仅需项目 URL + Secret。"""
    return bool(resolve_supabase_project_url() and resolve_supabase_secret_key())
