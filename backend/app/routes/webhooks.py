import hmac
import hashlib
import json as json_module
import logging

from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool
from ..config import config

webhooks_bp = Blueprint("webhooks", url_prefix="/api/webhooks")
logger = logging.getLogger("labelflow.webhooks")


async def _resolve_token(token: str, conn) -> str | None:
    """Return user_id for the given agent token, or None."""
    if not token:
        return None
    row = await conn.fetchrow(
        "SELECT user_id FROM user_settings WHERE agent_token = $1", token
    )
    return row["user_id"] if row else None


@webhooks_bp.route("/woocommerce", methods=["POST"])
async def woocommerce_webhook(request):
    # Validate HMAC-SHA256 signature
    signature = request.headers.get("X-WC-Webhook-Signature", "")
    raw_body = request.body

    expected = hmac.new(
        config.WOO_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).digest()

    import base64
    expected_b64 = base64.b64encode(expected).decode()

    if not hmac.compare_digest(expected_b64, signature):
        logger.warning("WooCommerce webhook signature mismatch")
        return sanic_json({"error": "Invalid signature"}, status=401)

    try:
        payload = json_module.loads(raw_body)
    except Exception:
        return sanic_json({"error": "Invalid JSON"}, status=400)

    woo_order_id = str(payload.get("id", ""))
    if not woo_order_id:
        return sanic_json({"error": "No order ID"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        # Resolve owner from the token in the URL (?token=...)
        token = request.args.get("token", "")
        owner_id = await _resolve_token(token, conn)
        if not owner_id:
            logger.warning("WooCommerce webhook received with invalid/missing token")
            return sanic_json({"error": "Invalid token — include ?token=YOUR_AGENT_TOKEN in the webhook URL"}, status=401)

        # Upsert order
        existing = await conn.fetchrow(
            "SELECT id, status FROM woo_orders WHERE woo_order_id=$1 AND owner_id=$2",
            woo_order_id, owner_id,
        )
        if existing:
            order_uuid = existing["id"]
            await conn.execute(
                "UPDATE woo_orders SET raw_json=$1::jsonb WHERE id=$2",
                json_module.dumps(payload), order_uuid,
            )
        else:
            order_uuid = await conn.fetchval(
                "INSERT INTO woo_orders (woo_order_id, raw_json, status, owner_id) VALUES ($1, $2::jsonb, 'pending', $3) RETURNING id",
                woo_order_id, json_module.dumps(payload), owner_id,
            )

        # Parse line items and match to this user's variants
        line_items = payload.get("line_items", [])
        unmatched = []
        for item in line_items:
            sku = item.get("sku", "").strip()
            quantity = item.get("quantity", 1)
            if not sku:
                unmatched.append(item)
                continue
            variant = await conn.fetchrow(
                """SELECT pv.id FROM product_variants pv
                   JOIN products p ON p.id = pv.product_id
                   WHERE pv.sku=$1 AND pv.is_active=true AND p.owner_id=$2 LIMIT 1""",
                sku, owner_id,
            )
            if variant:
                await conn.execute(
                    """INSERT INTO print_jobs (type, woo_order_id, variant_id, label_type, quantity, status, owner_id)
                    VALUES ('woocommerce', $1, $2, 1, $3, 'queued', $4)""",
                    order_uuid, variant["id"], quantity, owner_id,
                )
            else:
                unmatched.append({"sku": sku, "quantity": quantity, "name": item.get("name", "")})

        if unmatched:
            logger.warning("Unmatched SKUs in order %s: %s", woo_order_id, unmatched)
            await conn.execute(
                "UPDATE woo_orders SET raw_json = raw_json || $1::jsonb WHERE id=$2",
                json_module.dumps({"_unmatched": unmatched}), order_uuid,
            )

    return sanic_json({"ok": True, "order_uuid": str(order_uuid)})
