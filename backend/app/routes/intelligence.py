from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from datetime import date

intelligence_bp = Blueprint("intelligence", url_prefix="/api/intelligence")


def _require_admin_or_manager(request):
    user = request.ctx.user
    if user.get("role") not in ("manager",) and not user.get("is_platform_admin"):
        return sanic_json({"error": "Admin or Manager access required"}, status=403)
    return None


@intelligence_bp.route("/stats", methods=["GET"])
async def get_intelligence_stats(request):
    err = _require_admin_or_manager(request)
    if err:
        return err
    
    user = request.ctx.user
    org_id = user.get("org_id")
    is_platform_admin = user.get("is_platform_admin")
    
    pool = get_pool()
    stats = {}

    async with pool.acquire() as conn:
        if is_platform_admin:
            stats["total_organizations"] = await conn.fetchval("SELECT COUNT(*) FROM organizations")
            stats["total_users"] = await conn.fetchval("SELECT COUNT(*) FROM users")
            stats["total_agents"] = await conn.fetchval("SELECT COUNT(*) FROM agents")
            stats["total_products"] = await conn.fetchval("SELECT COUNT(*) FROM products")
            stats["total_variants"] = await conn.fetchval("SELECT COUNT(*) FROM product_variants")
            stats["total_print_jobs"] = await conn.fetchval("SELECT COUNT(*) FROM print_jobs")
            stats["total_labels_printed_monthly"] = await conn.fetchval(
                "SELECT COALESCE(SUM(count), 0) FROM print_quota_usage WHERE month=$1", date.today().replace(day=1)
            )
        else:
            stats["organization_users"] = await conn.fetchval("SELECT COUNT(*) FROM users WHERE org_id=$1", org_id)
            stats["organization_agents"] = await conn.fetchval("SELECT COUNT(*) FROM agents WHERE org_id=$1", org_id)
            stats["organization_products"] = await conn.fetchval("SELECT COUNT(*) FROM products WHERE org_id=$1", org_id)
            stats["organization_variants"] = await conn.fetchval("SELECT COUNT(*) FROM product_variants pv JOIN products p ON pv.product_id = p.id WHERE p.org_id=$1", org_id)
            stats["organization_print_jobs"] = await conn.fetchval("SELECT COUNT(*) FROM print_jobs WHERE org_id=$1", org_id)
            stats["organization_labels_printed_monthly"] = await conn.fetchval(
                "SELECT COALESCE(SUM(count), 0) FROM print_quota_usage WHERE org_id=$1 AND month=$2", org_id, date.today().replace(day=1)
            )

        # Common stats for both platform admin and organization managers
        pending_orders = await conn.fetch(
            "SELECT id FROM woo_orders WHERE status = 'pending' AND org_id=$1", org_id if not is_platform_admin else None
        )
        stats["pending_orders_total"] = len(pending_orders)
        
        attention_orders = 0
        for order_row in pending_orders:
            order_id = order_row["id"]
            raw_json = await conn.fetchval("SELECT raw_json FROM woo_orders WHERE id=$1", order_id)
            raw = json.loads(raw_json) if raw_json else {}
            unmatched = raw.get("_unmatched", [])
            
            jobs = await conn.fetch(
                """SELECT pj.id FROM print_jobs pj
                   WHERE pj.woo_order_id = $1 AND pj.status = 'queued'""",
                order_id,
            )
            if len(unmatched) > 0 or len(jobs) == 0:
                attention_orders += 1
        stats["pending_orders_attention"] = attention_orders

    return sanic_json(stats)
