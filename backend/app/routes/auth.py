import re
from datetime import datetime, timedelta
from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from ..auth import verify_password, create_session, delete_session, validate_token, hash_password

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
            "SELECT id, username, password_hash, is_admin, org_id, role, is_platform_admin FROM users WHERE username = $1",
            username,
        )

    if not user or not await verify_password(password, user["password_hash"]):
        return sanic_json({"error": "Invalid credentials"}, status=401)

    token = await create_session(user["id"])
    return sanic_json({
        "token": token,
        "username": user["username"],
        "is_admin": user["is_admin"],
        "org_id": str(user["org_id"]) if user["org_id"] else None,
        "role": user["role"],
        "is_platform_admin": user["is_platform_admin"],
    })


@auth_bp.route("/signup", methods=["POST"])
async def signup(request):
    data = request.json or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    company_name = data.get("company_name", "").strip()

    if not all([username, password, company_name]):
        return sanic_json({"error": "All fields required"}, status=400)
    if len(password) < 8:
        return sanic_json({"error": "Password must be at least 8 characters"}, status=400)

    # Generate slug from company name
    slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-')
    slug_base = slug

    pool = get_pool()
    async with pool.acquire() as conn:
        # Check username taken
        if await conn.fetchval("SELECT id FROM users WHERE username=$1", username):
            return sanic_json({"error": "Username already taken"}, status=409)

        # Ensure unique slug
        counter = 0
        while await conn.fetchval("SELECT id FROM organizations WHERE slug=$1", slug):
            counter += 1
            slug = f"{slug_base}-{counter}"

        # Get starter plan
        plan_id = await conn.fetchval("SELECT id FROM plans WHERE is_public=true ORDER BY created_at LIMIT 1")

        trial_ends_at = datetime.utcnow() + timedelta(days=30)

        async with conn.transaction():
            # Create org
            org_id = await conn.fetchval(
                """INSERT INTO organizations (name, slug, plan_id, subscription_status, trial_ends_at)
                   VALUES ($1, $2, $3, 'trialing', $4) RETURNING id""",
                company_name, slug, plan_id, trial_ends_at,
            )

            # Create manager user
            pw_hash = await hash_password(password)
            user_id = await conn.fetchval(
                """INSERT INTO users (username, password_hash, org_id, role, is_platform_admin)
                   VALUES ($1, $2, $3, 'manager', false) RETURNING id""",
                username, pw_hash, org_id,
            )

    # Create session
    token = await create_session(user_id)
    return sanic_json({
        "token": token,
        "username": username,
        "is_admin": False,
        "is_platform_admin": False,
        "role": "manager",
        "org_id": str(org_id),
    }, status=201)


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
        "org_id": request.ctx.user.get("org_id"),
        "role": request.ctx.user.get("role", "subuser"),
        "is_platform_admin": request.ctx.user.get("is_platform_admin", False),
        "default_agent_id": request.ctx.user.get("default_agent_id"),
    })
