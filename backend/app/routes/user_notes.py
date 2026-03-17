from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool

user_notes_bp = Blueprint("user_notes", url_prefix="/api/users")


def _require_manager(request):
    if request.ctx.user.get("role") != "manager":
        return sanic_json({"error": "Manager role required"}, status=403)
    return None


@user_notes_bp.route("/", methods=["GET"])
async def list_users(request):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT u.id, u.username, u.role, u.created_at,
                      COUNT(n.id) as note_count
               FROM users u
               LEFT JOIN user_notes n ON n.user_id = u.id
               WHERE u.org_id = $1
               GROUP BY u.id
               ORDER BY u.created_at DESC""",
            org_id,
        )
    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["note_count"] = int(d["note_count"])
        result.append(d)
    return sanic_json(result)


@user_notes_bp.route("/<user_id>", methods=["GET"])
async def get_user_detail(request, user_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, role, created_at FROM users WHERE id=$1 AND org_id=$2",
            user_id, org_id,
        )
        if not user:
            return sanic_json({"error": "User not found"}, status=404)
        notes = await conn.fetch(
            """SELECT n.id, n.content, n.created_at, u.username as author_username
               FROM user_notes n
               LEFT JOIN users u ON u.id = n.author_id
               WHERE n.user_id=$1 AND n.org_id=$2
               ORDER BY n.created_at DESC""",
            user_id, org_id,
        )
    u = dict(user)
    u["created_at"] = u["created_at"].isoformat()
    ns = []
    for n in notes:
        d = dict(n)
        d["created_at"] = d["created_at"].isoformat()
        ns.append(d)
    return sanic_json({"user": u, "notes": ns})


@user_notes_bp.route("/<user_id>/notes", methods=["POST"])
async def add_note(request, user_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    author_id = request.ctx.user.get("user_id")
    content = (request.json or {}).get("content", "").strip()
    if not content:
        return sanic_json({"error": "Content required"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        # Verify user belongs to same org
        exists = await conn.fetchval(
            "SELECT 1 FROM users WHERE id=$1 AND org_id=$2", user_id, org_id
        )
        if not exists:
            return sanic_json({"error": "User not found"}, status=404)
        row = await conn.fetchrow(
            """INSERT INTO user_notes (user_id, org_id, author_id, content)
               VALUES ($1, $2, $3, $4) RETURNING id, content, created_at""",
            user_id, org_id, author_id, content,
        )
    d = dict(row)
    d["created_at"] = d["created_at"].isoformat()
    return sanic_json(d, status=201)


@user_notes_bp.route("/notes/<note_id>", methods=["DELETE"])
async def delete_note(request, note_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM user_notes WHERE id=$1 AND org_id=$2", note_id, org_id
        )
    if result == "DELETE 0":
        return sanic_json({"error": "Note not found"}, status=404)
    return sanic_json({"ok": True})
