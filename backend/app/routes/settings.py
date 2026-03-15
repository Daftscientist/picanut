from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from ..auth import hash_password, delete_all_sessions

settings_bp = Blueprint("settings", url_prefix="/api/settings")


def _require_manager(request):
    user = request.ctx.user
    if user.get("role") not in ("manager",) and not user.get("is_platform_admin"):
        return sanic_json({"error": "Manager access required"}, status=403)
    return None


@settings_bp.route("/users", methods=["GET"])
async def list_users(request):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, username, role, created_at FROM users WHERE org_id=$1 ORDER BY created_at",
            org_id,
        )
    return sanic_json([
        {"id": r["id"], "username": r["username"], "role": r["role"], "created_at": r["created_at"].isoformat()}
        for r in rows
    ])


@settings_bp.route("/users", methods=["POST"])
async def create_user(request):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    role = data.get("role", "subuser")

    if not username or not password:
        return sanic_json({"error": "Username and password required"}, status=400)
    if len(password) < 6:
        return sanic_json({"error": "Password must be at least 6 characters"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        # Check subuser limit
        plan = await conn.fetchrow(
            """SELECT p.subuser_limit FROM plans p
               JOIN organizations o ON o.plan_id=p.id WHERE o.id=$1""",
            org_id,
        )
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM users WHERE org_id=$1 AND role='subuser'", org_id
        )
        if plan and role == "subuser" and count >= plan["subuser_limit"] * 1.1:
            return sanic_json({"error": "Subuser limit reached. Upgrade your plan.", "limit_hit": True}, status=402)

        existing = await conn.fetchval("SELECT id FROM users WHERE username=$1", username)
        if existing:
            return sanic_json({"error": "Username already taken"}, status=409)

        pw_hash = await hash_password(password)
        row = await conn.fetchrow(
            "INSERT INTO users (username, password_hash, org_id, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role, created_at",
            username, pw_hash, org_id, role,
        )
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result, status=201)


@settings_bp.route("/user", methods=["GET"])
async def get_user_settings(request):
    user = request.ctx.user
    return sanic_json({
        "default_agent_id": user.get("default_agent_id"),
        "role": user.get("role"),
        "org_id": user.get("org_id"),
    })


@settings_bp.route("/user/default-agent", methods=["PUT"])
async def set_default_agent(request):
    user_id = request.ctx.user["user_id"]
    data = request.json or {}
    agent_id = data.get("agent_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET default_agent_id=$1 WHERE id=$2",
            agent_id, user_id,
        )
    return sanic_json({"ok": True})


@settings_bp.route("/revoke-sessions", methods=["POST"])
async def revoke_sessions(request):
    user_id = request.ctx.user["user_id"]
    await delete_all_sessions(user_id)
    return sanic_json({"ok": True})
