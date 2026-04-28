"""Bearer JWT 依赖注入单元测试（不依赖数据库）。"""
from __future__ import annotations

import os
import unittest
from unittest.mock import patch

import jwt
from fastapi import HTTPException


class TestBearerAuthDeps(unittest.IsolatedAsyncioTestCase):
    async def test_missing_auth_header_raises_401(self) -> None:
        from app.core.deps import get_current_user_id

        with self.assertRaises(HTTPException) as cx:
            await get_current_user_id(None)
        self.assertEqual(cx.exception.status_code, 401)

    async def test_valid_hs256_returns_sub(self) -> None:
        secret = "k" * 40
        tok = jwt.encode(
            {"sub": "user-uuid-1", "aud": "authenticated"},
            secret,
            algorithm="HS256",
        )
        with patch.dict(
            os.environ,
            {"AUTH_MODE": "supabase", "SUPABASE_JWT_SECRET": secret},
            clear=False,
        ):
            from app.core.deps import get_current_user_id

            uid = await get_current_user_id(f"Bearer {tok}")
            self.assertEqual(uid, "user-uuid-1")

    async def test_wrong_signature_raises_401(self) -> None:
        secret_sign = "a" * 40
        secret_verify = "b" * 40
        tok = jwt.encode(
            {"sub": "user-uuid-1", "aud": "authenticated"},
            secret_sign,
            algorithm="HS256",
        )
        with patch.dict(
            os.environ,
            {"AUTH_MODE": "supabase", "SUPABASE_JWT_SECRET": secret_verify},
            clear=False,
        ):
            from app.core.deps import get_current_user_id

            with self.assertRaises(HTTPException) as cx:
                await get_current_user_id(f"Bearer {tok}")
            self.assertEqual(cx.exception.status_code, 401)

    async def test_missing_jwt_secret_returns_500(self) -> None:
        tok = jwt.encode(
            {"sub": "user-uuid-1", "aud": "authenticated"},
            "fixed-secret-for-encoding-only-32bytes!!".ljust(40, "!")[:40],
            algorithm="HS256",
        )
        from app.core import deps as deps_mod

        with patch.object(deps_mod, "_jwt_secret", return_value=None):
            with self.assertRaises(HTTPException) as cx:
                await deps_mod.get_current_user_id(f"Bearer {tok}")
            self.assertEqual(cx.exception.status_code, 500)


if __name__ == "__main__":
    unittest.main()
