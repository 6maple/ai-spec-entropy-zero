"""
Supabase Python 服务端客户端（createClient(..., SUPABASE_SECRET_KEY)）。

仅用环境变量：`SUPABASE_URL`、`SUPABASE_SECRET_KEY`。
"""

from dotenv import load_dotenv
from supabase import Client, create_client

from app.db.supabase_env import (
    resolve_supabase_project_url,
    resolve_supabase_secret_key,
)

load_dotenv()

SUPABASE_URL = resolve_supabase_project_url()
SUPABASE_SECRET_KEY = resolve_supabase_secret_key()

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise ValueError(
        "须在 .env 中配置 SUPABASE_URL 与 SUPABASE_SECRET_KEY。"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
