import secrets
import bcrypt
from sanic import Request
from sanic.response import json as sanic_json
from .db import get_pool


def generate_token() -> str:
    return secrets.token_urlsafe(48)


async def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


async def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


async def create_session(user_id: str) -> str:
    token = generate_token()
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO sessions (user_id, token) VALUES ($1, $2)",
            user_id,
            token,
        )
    return token


async def validate_token(token: str) -> dict | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT s.id as session_id, u.id as user_id, u.username, u.is_admin
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = $1
            """,
            token,
        )
    if row:
        return dict(row)
    return None


async def delete_session(token: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sessions WHERE token = $1", token)


async def delete_all_sessions(user_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sessions WHERE user_id = $1", user_id)


def auth_middleware(excluded_paths: list[str]):
    async def middleware(request: Request):
        for path in excluded_paths:
            if request.path.startswith(path):
                return None

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return sanic_json({"error": "Unauthorised"}, status=401)

        token = auth_header[7:]
        user = await validate_token(token)
        if not user:
            return sanic_json({"error": "Unauthorised"}, status=401)

        request.ctx.user = user
        return None

    return middleware
