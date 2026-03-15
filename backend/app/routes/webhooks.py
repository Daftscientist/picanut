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
        # Upsert order
        existing = await conn.fetchrow(
            "SELECT id, status FROM woo_orders WHERE woo_order_id=$1",
            woo_order_id,
        )
        if existing:
            order_uuid = existing["id"]
            await conn.execute(
                "UPDATE woo_orders SET raw_json=$1::jsonb WHERE id=$2",
                json_module.dumps(payload), order_uuid,
            )
        else:
            order_uuid = await conn.fetchval(
                "INSERT INTO woo_orders (woo_order_id, raw_json, status) VALUES ($1, $2::jsonb, 'pending') RETURNING id",
                woo_order_id, json_module.dumps(payload),
            )

        # Parse line items and match to variants
        line_items = payload.get("line_items", [])
        unmatched = []
        for item in line_items:
            sku = item.get("sku", "").strip()
            quantity = item.get("quantity", 1)
            if not sku:
                unmatched.append(item)
                continue
            variant = await conn.fetchrow(
                "SELECT id FROM product_variants WHERE sku=$1 AND is_active=true LIMIT 1",
                sku,
            )
            if variant:
                # Create a print job for each matched item
                await conn.execute(
                    """INSERT INTO print_jobs (type, woo_order_id, variant_id, label_type, quantity, status)
                    VALUES ('woocommerce', $1, $2, 1, $3, 'queued')""",
                    order_uuid, variant["id"], quantity,
                )
            else:
                unmatched.append({"sku": sku, "quantity": quantity, "name": item.get("name", "")})

        if unmatched:
            logger.warning("Unmatched SKUs in order %s: %s", woo_order_id, unmatched)
            # Store unmatched info in order's raw_json extra field
            await conn.execute(
                "UPDATE woo_orders SET raw_json = raw_json || $1::jsonb WHERE id=$2",
                json_module.dumps({"_unmatched": unmatched}), order_uuid,
            )

    return sanic_json({"ok": True, "order_uuid": str(order_uuid)})
