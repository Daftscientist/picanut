from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from ..auth import verify_password, create_session, delete_session, validate_token

auth_bp = Blueprint("auth", url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
async def login(request):
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return sanic_json({"error": "Username and password required"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, password_hash, is_admin FROM users WHERE username = $1",
            username,
        )

    if not user or not await verify_password(password, user["password_hash"]):
        return sanic_json({"error": "Invalid credentials"}, status=401)

    token = await create_session(user["id"])
    return sanic_json({"token": token, "username": user["username"], "is_admin": user["is_admin"]})


@auth_bp.route("/logout", methods=["POST"])
async def logout(request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        await delete_session(token)
    return sanic_json({"ok": True})


@auth_bp.route("/me", methods=["GET"])
async def me(request):
    return sanic_json({
        "user_id": request.ctx.user["user_id"],
        "username": request.ctx.user["username"],
        "is_admin": request.ctx.user.get("is_admin", False),
    })
