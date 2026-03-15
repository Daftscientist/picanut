import secrets
import asyncio
from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool

agents_bp = Blueprint("agents", url_prefix="/api/agents")


def _require_manager(request):
    user = request.ctx.user
    if user.get("role") not in ("manager",) and not user.get("is_platform_admin"):
        return sanic_json({"error": "Manager access required"}, status=403)
    return None


@agents_bp.route("", methods=["GET"])
async def list_agents(request):
    org_id = request.ctx.user.get("org_id")
    if not org_id:
        return sanic_json({"agents": []})
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, selected_printer, paper_size, is_default, last_seen_at, created_at FROM agents WHERE org_id=$1 ORDER BY is_default DESC, created_at",
            org_id,
        )
    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["last_seen_at"] = d["last_seen_at"].isoformat() if d["last_seen_at"] else None
        last = request.app.ctx.agent_last_seen.get(d["id"])
        d["connected"] = last is not None and (asyncio.get_event_loop().time() - last) < 35
        result.append(d)
    return sanic_json({"agents": result})


@agents_bp.route("", methods=["POST"])
async def create_agent(request):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    if not org_id:
        return sanic_json({"error": "No organisation"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        # Check agent limit
        plan = await conn.fetchrow(
            """SELECT p.agent_limit FROM plans p
               JOIN organizations o ON o.plan_id = p.id
               WHERE o.id = $1""",
            org_id,
        )
        current_count = await conn.fetchval("SELECT COUNT(*) FROM agents WHERE org_id=$1", org_id)
        if plan and current_count >= plan["agent_limit"] * 1.1:
            return sanic_json({"error": "Agent limit reached. Upgrade your plan.", "limit_hit": True}, status=402)

        data = request.json or {}
        name = data.get("name", "New Agent").strip()
        token = secrets.token_urlsafe(32)

        # First agent is default
        is_default = current_count == 0

        row = await conn.fetchrow(
            """INSERT INTO agents (org_id, name, token, is_default)
               VALUES ($1, $2, $3, $4)
               RETURNING id, name, token, selected_printer, paper_size, is_default, created_at""",
            org_id, name, token, is_default,
        )

    request.app.ctx.token_to_agent[token] = row["id"]
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    result["connected"] = False
    return sanic_json(result, status=201)


@agents_bp.route("/<agent_id>", methods=["GET"])
async def get_agent(request, agent_id):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, name, token, selected_printer, paper_size, is_default, last_seen_at, created_at FROM agents WHERE id=$1 AND org_id=$2",
            agent_id, org_id,
        )
    if not row:
        return sanic_json({"error": "Not found"}, status=404)
    d = dict(row)
    d["created_at"] = d["created_at"].isoformat()
    d["last_seen_at"] = d["last_seen_at"].isoformat() if d["last_seen_at"] else None
    last = request.app.ctx.agent_last_seen.get(agent_id)
    d["connected"] = last is not None and (asyncio.get_event_loop().time() - last) < 35
    return sanic_json(d)


@agents_bp.route("/<agent_id>", methods=["PUT"])
async def update_agent(request, agent_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE agents SET
               name = COALESCE(NULLIF($1,''), name),
               selected_printer = COALESCE($2, selected_printer),
               paper_size = COALESCE($3, paper_size)
               WHERE id=$4 AND org_id=$5
               RETURNING id, name, token, selected_printer, paper_size, is_default, created_at""",
            data.get("name", ""), data.get("selected_printer"), data.get("paper_size"),
            agent_id, org_id,
        )
    if not row:
        return sanic_json({"error": "Not found"}, status=404)
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result)


@agents_bp.route("/<agent_id>", methods=["DELETE"])
async def delete_agent(request, agent_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        # Get token first to clear cache
        row = await conn.fetchrow("SELECT token FROM agents WHERE id=$1 AND org_id=$2", agent_id, org_id)
        if not row:
            return sanic_json({"error": "Not found"}, status=404)
        await conn.execute("DELETE FROM agents WHERE id=$1", agent_id)

    token = row["token"]
    request.app.ctx.token_to_agent.pop(token, None)
    request.app.ctx.agent_queues.pop(agent_id, None)
    request.app.ctx.agent_last_seen.pop(agent_id, None)
    return sanic_json({"ok": True})


@agents_bp.route("/<agent_id>/regenerate-token", methods=["POST"])
async def regenerate_token(request, agent_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    new_token = secrets.token_urlsafe(32)
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT token FROM agents WHERE id=$1 AND org_id=$2", agent_id, org_id)
        if not row:
            return sanic_json({"error": "Not found"}, status=404)
        await conn.execute("UPDATE agents SET token=$1 WHERE id=$2", new_token, agent_id)

    old_token = row["token"]
    request.app.ctx.token_to_agent.pop(old_token, None)
    request.app.ctx.token_to_agent[new_token] = agent_id
    return sanic_json({"token": new_token})


@agents_bp.route("/<agent_id>/set-default", methods=["POST"])
async def set_default_agent(request, agent_id):
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT id FROM agents WHERE id=$1 AND org_id=$2", agent_id, org_id)
        if not exists:
            return sanic_json({"error": "Not found"}, status=404)
        async with conn.transaction():
            await conn.execute("UPDATE agents SET is_default=false WHERE org_id=$1", org_id)
            await conn.execute("UPDATE agents SET is_default=true WHERE id=$1", agent_id)
            await conn.execute("UPDATE organizations SET default_agent_id=$1 WHERE id=$2", agent_id, org_id)
    return sanic_json({"ok": True})


@agents_bp.route("/<agent_id>/access", methods=["PUT"])
async def set_agent_access(request, agent_id):
    """Set whitelist/blacklist for a user on this agent."""
    err = _require_manager(request)
    if err:
        return err
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    user_id = data.get("user_id")
    access_type = data.get("access_type", "allow")  # 'allow' or 'deny'
    if access_type not in ("allow", "deny"):
        return sanic_json({"error": "access_type must be allow or deny"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT id FROM agents WHERE id=$1 AND org_id=$2", agent_id, org_id)
        if not exists:
            return sanic_json({"error": "Not found"}, status=404)
        await conn.execute(
            """INSERT INTO agent_access (agent_id, user_id, access_type) VALUES ($1, $2, $3)
               ON CONFLICT (agent_id, user_id) DO UPDATE SET access_type=$3""",
            agent_id, user_id, access_type,
        )
    return sanic_json({"ok": True})


@agents_bp.route("/<agent_id>/access/<user_id>", methods=["DELETE"])
async def remove_agent_access(request, agent_id, user_id):
    err = _require_manager(request)
    if err:
        return err
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM agent_access WHERE agent_id=$1 AND user_id=$2", agent_id, user_id)
    return sanic_json({"ok": True})
