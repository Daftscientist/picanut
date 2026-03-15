import secrets
from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from ..auth import hash_password, delete_all_sessions

settings_bp = Blueprint("settings", url_prefix="/api/settings")


@settings_bp.route("/users", methods=["POST"])
async def create_user(request):
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return sanic_json({"error": "Username and password required"}, status=400)
    if len(password) < 6:
        return sanic_json({"error": "Password must be at least 6 characters"}, status=400)
    pw_hash = await hash_password(password)
    pool = get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchval("SELECT id FROM users WHERE username=$1", username)
        if existing:
            return sanic_json({"error": "Username already taken"}, status=409)
        row = await conn.fetchrow(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at",
            username, pw_hash,
        )
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result, status=201)


@settings_bp.route("/agent-token/regenerate", methods=["POST"])
async def regenerate_agent_token(request):
    new_token = secrets.token_urlsafe(32)
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO app_settings (key, value) VALUES ('agent_token', $1) "
            "ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()",
            new_token,
        )
    request.app.ctx.agent_token = new_token
    # Disconnect current agent — it must reconnect with the new token
    ws = request.app.ctx.agent_ws
    if ws:
        try:
            await ws.close(4001, "Token regenerated")
        except Exception:
            pass
    return sanic_json({"token": new_token})


@settings_bp.route("/revoke-sessions", methods=["POST"])
async def revoke_sessions(request):
    user_id = request.ctx.user["user_id"]
    await delete_all_sessions(user_id)
    return sanic_json({"ok": True})


@settings_bp.route("/users", methods=["GET"])
async def list_users(request):
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, username, created_at FROM users ORDER BY created_at")
    return sanic_json([
        {"id": r["id"], "username": r["username"], "created_at": r["created_at"].isoformat()}
        for r in rows
    ])
