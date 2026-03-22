from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool

admin_bp = Blueprint("admin", url_prefix="/api/admin")


def _require_platform_admin(request):
    if not request.ctx.user.get("is_platform_admin"):
        return sanic_json({"error": "Platform admin only"}, status=403)
    return None


# ── Plans ──────────────────────────────────────────────────────────────────────

@admin_bp.route("/plans", methods=["GET"])
async def list_plans(request):
    err = _require_platform_admin(request)
    if err:
        return err
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM plans ORDER BY price_pence")
    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        result.append(d)
    return sanic_json(result)


@admin_bp.route("/plans", methods=["POST"])
async def create_plan(request):
    err = _require_platform_admin(request)
    if err:
        return err
    data = request.json or {}
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO plans (name, stripe_price_id, price_pence, trial_days,
               subuser_limit, agent_limit, product_limit, print_quota, is_public)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *""",
            data.get("name", "New Plan"),
            data.get("stripe_price_id"),
            int(data.get("price_pence", 0)),
            int(data.get("trial_days", 30)),
            int(data.get("subuser_limit", 5)),
            int(data.get("agent_limit", 2)),
            int(data.get("product_limit", 100)),
            int(data.get("print_quota", 1000)),
            data.get("is_public", True),
        )
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result, status=201)


@admin_bp.route("/plans/<plan_id>", methods=["PUT"])
async def update_plan(request, plan_id):
    err = _require_platform_admin(request)
    if err:
        return err
    data = request.json or {}
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE plans SET
               name=COALESCE(NULLIF($1,''), name),
               stripe_price_id=COALESCE($2, stripe_price_id),
               price_pence=COALESCE($3, price_pence),
               trial_days=COALESCE($4, trial_days),
               subuser_limit=COALESCE($5, subuser_limit),
               agent_limit=COALESCE($6, agent_limit),
               product_limit=COALESCE($7, product_limit),
               print_quota=COALESCE($8, print_quota),
               is_public=COALESCE($9, is_public)
               WHERE id=$10 RETURNING *""",
            data.get("name", ""), data.get("stripe_price_id"),
            data.get("price_pence"), data.get("trial_days"),
            data.get("subuser_limit"), data.get("agent_limit"),
            data.get("product_limit"), data.get("print_quota"),
            data.get("is_public"), plan_id,
        )
    if not row:
        return sanic_json({"error": "Not found"}, status=404)
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result)


@admin_bp.route("/plans/<plan_id>", methods=["DELETE"])
async def delete_plan(request, plan_id):
    err = _require_platform_admin(request)
    if err:
        return err
    pool = get_pool()
    async with pool.acquire() as conn:
        res = await conn.execute("DELETE FROM plans WHERE id=$1", plan_id)
    if res == "DELETE 0":
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json({"ok": True})


# ── Organizations ──────────────────────────────────────────────────────────────

@admin_bp.route("/organizations", methods=["GET"])
async def list_organizations(request):
    err = _require_platform_admin(request)
    if err:
        return err
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT o.*, p.name as plan_name,
               (SELECT COUNT(*) FROM users u WHERE u.org_id=o.id) as user_count,
               (SELECT COUNT(*) FROM agents a WHERE a.org_id=o.id) as agent_count
               FROM organizations o LEFT JOIN plans p ON p.id=o.plan_id
               ORDER BY o.created_at DESC"""
        )
    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["trial_ends_at"] = d["trial_ends_at"].isoformat() if d["trial_ends_at"] else None
        d["current_period_end"] = d["current_period_end"].isoformat() if d["current_period_end"] else None
        result.append(d)
    return sanic_json(result)


@admin_bp.route("/organizations/<org_id>", methods=["GET"])
async def get_organization(request, org_id):
    err = _require_platform_admin(request)
    if err:
        return err
    pool = get_pool()
    async with pool.acquire() as conn:
        org = await conn.fetchrow(
            "SELECT o.*, p.name as plan_name FROM organizations o LEFT JOIN plans p ON p.id=o.plan_id WHERE o.id=$1",
            org_id,
        )
        if not org:
            return sanic_json({"error": "Not found"}, status=404)
        users = await conn.fetch("SELECT id, username, role, created_at FROM users WHERE org_id=$1 ORDER BY created_at", org_id)
    d = dict(org)
    d["created_at"] = d["created_at"].isoformat()
    d["trial_ends_at"] = d["trial_ends_at"].isoformat() if d["trial_ends_at"] else None
    d["current_period_end"] = d["current_period_end"].isoformat() if d["current_period_end"] else None
    d["users"] = [{"id": u["id"], "username": u["username"], "role": u["role"], "created_at": u["created_at"].isoformat()} for u in users]
    return sanic_json(d)


@admin_bp.route("/organizations", methods=["POST"])
async def create_organization(request):
    err = _require_platform_admin(request)
    if err:
        return err
    data = request.json or {}
    name = data.get("name")
    slug = data.get("slug")
    if not name or not slug:
        return sanic_json({"error": "Name and slug are required"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                """INSERT INTO organizations (name, slug)
                   VALUES ($1, $2) RETURNING *""",
                name, slug
            )
            result = dict(row)
            result["created_at"] = result["created_at"].isoformat()
            # Manually add counts which are normally added in the LIST query
            result["user_count"] = 0
            result["agent_count"] = 0
            result["plan_name"] = None
            return sanic_json(result, status=201)
        except Exception as e:
            # Likely a unique constraint violation on the slug
            return sanic_json({"error": f"Failed to create organization: {e}"}, status=500)


@admin_bp.route("/organizations/<org_id>", methods=["PUT"])
async def update_organization(request, org_id):
    err = _require_platform_admin(request)
    if err:
        return err
    data = request.json or {}
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE organizations SET
               name=COALESCE(NULLIF($1,''), name),
               slug=COALESCE(NULLIF($2,''), slug),
               plan_id=COALESCE($3::uuid, plan_id),
               subscription_status=COALESCE(NULLIF($4,''), subscription_status)
               WHERE id=$5 RETURNING id, name, slug, subscription_status""",
            data.get("name"), data.get("slug"),
            data.get("plan_id"), data.get("subscription_status"), org_id,
        )
    if not row:
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json(dict(row))


@admin_bp.route("/organizations/<org_id>", methods=["DELETE"])
async def delete_organization(request, org_id):
    err = _require_platform_admin(request)
    if err:
        return err
    pool = get_pool()
    async with pool.acquire() as conn:
        res = await conn.execute("DELETE FROM organizations WHERE id=$1", org_id)
    if res == "DELETE 0":
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json({"ok": True})

