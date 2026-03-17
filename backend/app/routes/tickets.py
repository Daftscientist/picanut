from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool

tickets_bp = Blueprint("tickets", url_prefix="/api/tickets")


@tickets_bp.route("/", methods=["GET"])
async def list_tickets(request):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT t.*, u.username as created_by_username,
               (SELECT COUNT(*) FROM support_ticket_messages m WHERE m.ticket_id = t.id) as message_count
               FROM support_tickets t
               LEFT JOIN users u ON u.id = t.created_by
               WHERE t.org_id = $1
               ORDER BY t.updated_at DESC""",
            org_id,
        )
    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["updated_at"] = d["updated_at"].isoformat()
        result.append(d)
    return sanic_json(result)


@tickets_bp.route("/", methods=["POST"])
async def create_ticket(request):
    org_id = request.ctx.user.get("org_id")
    user_id = request.ctx.user.get("user_id")
    data = request.json or {}
    subject = data.get("subject", "").strip()
    body = data.get("body", "").strip()
    priority = data.get("priority", "normal")
    if not subject or not body:
        return sanic_json({"error": "subject and body required"}, status=400)
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            ticket_id = await conn.fetchval(
                """INSERT INTO support_tickets (org_id, created_by, subject, priority)
                   VALUES ($1, $2, $3, $4) RETURNING id""",
                org_id, user_id, subject, priority,
            )
            await conn.execute(
                """INSERT INTO support_ticket_messages (ticket_id, user_id, is_staff, body)
                   VALUES ($1, $2, false, $3)""",
                ticket_id, user_id, body,
            )
    return sanic_json({"id": str(ticket_id)}, status=201)


@tickets_bp.route("/<ticket_id>", methods=["GET"])
async def get_ticket(request, ticket_id):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        ticket = await conn.fetchrow(
            "SELECT * FROM support_tickets WHERE id=$1 AND org_id=$2",
            ticket_id, org_id,
        )
        if not ticket:
            return sanic_json({"error": "Not found"}, status=404)
        messages = await conn.fetch(
            """SELECT m.*, u.username FROM support_ticket_messages m
               LEFT JOIN users u ON u.id = m.user_id
               WHERE m.ticket_id = $1 ORDER BY m.created_at""",
            ticket_id,
        )
    t = dict(ticket)
    t["created_at"] = t["created_at"].isoformat()
    t["updated_at"] = t["updated_at"].isoformat()
    t["messages"] = [
        {**dict(m), "created_at": m["created_at"].isoformat()}
        for m in messages
    ]
    return sanic_json(t)


@tickets_bp.route("/<ticket_id>/messages", methods=["POST"])
async def add_message(request, ticket_id):
    org_id = request.ctx.user.get("org_id")
    user_id = request.ctx.user.get("user_id")
    data = request.json or {}
    body = data.get("body", "").strip()
    if not body:
        return sanic_json({"error": "body required"}, status=400)
    pool = get_pool()
    async with pool.acquire() as conn:
        ticket = await conn.fetchrow(
            "SELECT id FROM support_tickets WHERE id=$1 AND org_id=$2", ticket_id, org_id,
        )
        if not ticket:
            return sanic_json({"error": "Not found"}, status=404)
        await conn.execute(
            """INSERT INTO support_ticket_messages (ticket_id, user_id, is_staff, body)
               VALUES ($1, $2, false, $3)""",
            ticket_id, user_id, body,
        )
        await conn.execute(
            "UPDATE support_tickets SET updated_at=NOW() WHERE id=$1", ticket_id,
        )
    return sanic_json({"ok": True}, status=201)
