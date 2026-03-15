import stripe
from datetime import datetime, timedelta, date
from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from ..config import config

billing_bp = Blueprint("billing", url_prefix="/api/billing")


def _stripe():
    stripe.api_key = config.STRIPE_SECRET_KEY
    return stripe


@billing_bp.route("/plans", methods=["GET"])
async def list_plans(request):
    """Public — no auth required."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, price_pence, trial_days, subuser_limit, agent_limit, product_limit, print_quota FROM plans WHERE is_public=true ORDER BY price_pence"
        )
    return sanic_json([dict(r) for r in rows])


@billing_bp.route("/status", methods=["GET"])
async def billing_status(request):
    org_id = request.ctx.user.get("org_id")
    if not org_id:
        return sanic_json({"error": "No organisation"}, status=400)
    pool = get_pool()
    async with pool.acquire() as conn:
        org = await conn.fetchrow(
            """SELECT o.*, p.name as plan_name, p.price_pence, p.subuser_limit, p.agent_limit,
                      p.product_limit, p.print_quota
               FROM organizations o
               LEFT JOIN plans p ON p.id = o.plan_id
               WHERE o.id = $1""",
            org_id,
        )
        if not org:
            return sanic_json({"error": "Org not found"}, status=404)

        month_start = date.today().replace(day=1)
        quota_used = await conn.fetchval(
            "SELECT COALESCE(SUM(count), 0) FROM print_quota_usage WHERE org_id=$1 AND month=$2",
            org_id, month_start,
        )
        product_count = await conn.fetchval("SELECT COUNT(*) FROM products WHERE org_id=$1", org_id)
        agent_count = await conn.fetchval("SELECT COUNT(*) FROM agents WHERE org_id=$1", org_id)
        subuser_count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE org_id=$1 AND role='subuser'", org_id)

    o = dict(org)
    o["trial_ends_at"] = o["trial_ends_at"].isoformat() if o["trial_ends_at"] else None
    o["current_period_end"] = o["current_period_end"].isoformat() if o["current_period_end"] else None
    o["created_at"] = o["created_at"].isoformat()
    o["usage"] = {
        "quota": {"used": int(quota_used), "limit": org["print_quota"] or 0},
        "products": {"used": int(product_count), "limit": org["product_limit"] or 0},
        "agents": {"used": int(agent_count), "limit": org["agent_limit"] or 0},
        "subusers": {"used": int(subuser_count), "limit": org["subuser_limit"] or 0},
    }
    return sanic_json(o)


@billing_bp.route("/checkout", methods=["POST"])
async def create_checkout(request):
    org_id = request.ctx.user.get("org_id")
    if not org_id:
        return sanic_json({"error": "No organisation"}, status=400)

    data = request.json or {}
    plan_id = data.get("plan_id")

    pool = get_pool()
    async with pool.acquire() as conn:
        org = await conn.fetchrow("SELECT * FROM organizations WHERE id=$1", org_id)
        plan = await conn.fetchrow("SELECT * FROM plans WHERE id=$1", plan_id)

    if not plan or not plan["stripe_price_id"]:
        return sanic_json({"error": "Plan not available for purchase"}, status=400)

    s = _stripe()
    origin = request.headers.get("Origin", "https://localhost")

    # Create or get Stripe customer
    customer_id = org["stripe_customer_id"]
    if not customer_id:
        customer = s.Customer.create(
            name=org["name"],
            metadata={"org_id": str(org_id)},
        )
        customer_id = customer["id"]
        pool2 = get_pool()
        async with pool2.acquire() as conn:
            await conn.execute(
                "UPDATE organizations SET stripe_customer_id=$1 WHERE id=$2",
                customer_id, org_id,
            )

    # Trial end timestamp
    trial_end = int((datetime.utcnow() + timedelta(days=plan["trial_days"])).timestamp())

    session = s.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": plan["stripe_price_id"], "quantity": 1}],
        subscription_data={"trial_end": trial_end},
        success_url=f"{origin}/billing?session_id={{CHECKOUT_SESSION_ID}}&success=1",
        cancel_url=f"{origin}/billing?cancelled=1",
        metadata={"org_id": str(org_id), "plan_id": str(plan_id)},
    )
    return sanic_json({"url": session["url"]})


@billing_bp.route("/portal", methods=["POST"])
async def customer_portal(request):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        org = await conn.fetchrow("SELECT stripe_customer_id FROM organizations WHERE id=$1", org_id)

    if not org or not org["stripe_customer_id"]:
        return sanic_json({"error": "No billing account found"}, status=400)

    origin = request.headers.get("Origin", "https://localhost")
    s = _stripe()
    session = s.billing_portal.Session.create(
        customer=org["stripe_customer_id"],
        return_url=f"{origin}/billing",
    )
    return sanic_json({"url": session["url"]})


@billing_bp.route("/webhook", methods=["POST"])
async def stripe_webhook(request):
    """Stripe sends events here. No auth required — verified by signature."""
    payload = request.body
    sig = request.headers.get("Stripe-Signature", "")

    s = _stripe()
    try:
        event = s.Webhook.construct_event(payload, sig, config.STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        return sanic_json({"error": str(e)}, status=400)

    pool = get_pool()

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        org_id = session.get("metadata", {}).get("org_id")
        plan_id = session.get("metadata", {}).get("plan_id")
        sub_id = session.get("subscription")
        customer_id = session.get("customer")
        if org_id:
            async with pool.acquire() as conn:
                await conn.execute(
                    """UPDATE organizations SET
                       stripe_customer_id=COALESCE($1, stripe_customer_id),
                       stripe_subscription_id=$2,
                       plan_id=COALESCE($3::uuid, plan_id),
                       subscription_status='active'
                       WHERE id=$4""",
                    customer_id, sub_id, plan_id, org_id,
                )

    elif event["type"] in ("customer.subscription.updated", "customer.subscription.created"):
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        status = sub.get("status")
        period_end = sub.get("current_period_end")
        period_end_dt = datetime.utcfromtimestamp(period_end) if period_end else None
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE organizations SET subscription_status=$1, current_period_end=$2
                   WHERE stripe_customer_id=$3""",
                status, period_end_dt, customer_id,
            )

    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE organizations SET subscription_status='cancelled' WHERE stripe_customer_id=$1",
                customer_id,
            )

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        customer_id = invoice.get("customer")
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE organizations SET subscription_status='past_due' WHERE stripe_customer_id=$1",
                customer_id,
            )

    return sanic_json({"ok": True})
