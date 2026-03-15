import json as json_module
import logging
from sanic import Blueprint
from sanic.response import json as sanic_json, HTTPResponse
from ..db import get_pool
from ..labels.renderer import render_label
from ..labels.printer import image_to_raster_bytes

print_jobs_bp = Blueprint("print_jobs", url_prefix="/api/print")
logger = logging.getLogger("labelflow.print_jobs")


@print_jobs_bp.route("/render", methods=["POST"])
async def render(request):
    user_id = request.ctx.user["user_id"]
    data = request.json or {}
    variant_id = data.get("variant_id")
    label_type = int(data.get("label_type", 1))
    quantity = max(1, int(data.get("quantity", 1)))

    pool = get_pool()
    params: dict = {}

    if variant_id:
        async with pool.acquire() as conn:
            variant = await conn.fetchrow(
                """SELECT pv.id, pv.sku, pv.barcode, pv.weight_g, pv.price_gbp,
                          pv.nutrition_json, p.name as product_name,
                          p.description, p.brand
                   FROM product_variants pv
                   JOIN products p ON p.id = pv.product_id
                   WHERE pv.id = $1 AND p.owner_id = $2""",
                variant_id, user_id,
            )
        if not variant:
            return sanic_json({"error": "Variant not found"}, status=404)

        params["product_name"] = variant["product_name"]
        params["brand"] = variant["brand"] or ""
        params["description"] = variant["description"] or ""
        params["barcode"] = variant["barcode"]
        params["weight_g"] = float(variant["weight_g"]) if variant["weight_g"] is not None else None
        params["price_gbp"] = float(variant["price_gbp"]) if variant["price_gbp"] is not None else None
        nutrition = variant["nutrition_json"]
        if nutrition and isinstance(nutrition, str):
            nutrition = json_module.loads(nutrition)
        params["nutrition_json"] = nutrition
        params["ingredients"] = data.get("ingredients", "")

    if label_type == 2:
        params["info_brand"] = data.get("info_brand", params.get("brand", ""))
        params["info_title"] = data.get("info_title", params.get("product_name", ""))
        params["info_body"] = data.get("info_body", params.get("description", ""))

    try:
        image = render_label(label_type, params)
        raster_bytes = image_to_raster_bytes(image)
    except Exception as e:
        logger.error("Label render error: %s", e)
        return sanic_json({"error": str(e)}, status=500)

    job_id = None
    async with pool.acquire() as conn:
        extra = {k: v for k, v in data.items() if k not in ("variant_id", "label_type", "quantity")}
        job_id = await conn.fetchval(
            """INSERT INTO print_jobs (type, variant_id, label_type, quantity, status, owner_id, extra_json)
               VALUES ('manual', $1, $2, $3, 'queued', $4, $5::jsonb)
               RETURNING id""",
            variant_id, label_type, quantity, user_id,
            json_module.dumps(extra) if extra else None,
        )

    return HTTPResponse(
        body=raster_bytes,
        status=200,
        content_type="application/octet-stream",
        headers={"X-Job-Id": str(job_id) if job_id else ""},
    )


@print_jobs_bp.route("/<job_id>/confirm", methods=["POST"])
async def confirm(request, job_id):
    user_id = request.ctx.user["user_id"]
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """UPDATE print_jobs
               SET status='printed', printed_at=NOW()
               WHERE id=$1 AND owner_id=$2
               RETURNING id, status, woo_order_id""",
            job_id, user_id,
        )
    if not row:
        return sanic_json({"error": "Job not found"}, status=404)

    woo_order_id = row["woo_order_id"]
    if woo_order_id:
        async with pool.acquire() as conn:
            pending = await conn.fetchval(
                "SELECT COUNT(*) FROM print_jobs WHERE woo_order_id=$1 AND status='queued'",
                woo_order_id,
            )
            if pending == 0:
                await conn.execute(
                    "UPDATE woo_orders SET status='printed' WHERE id=$1",
                    woo_order_id,
                )

    return sanic_json({"ok": True, "job_id": str(row["id"])})


@print_jobs_bp.route("/jobs", methods=["GET"])
async def list_jobs(request):
    user_id = request.ctx.user["user_id"]
    limit = int(request.args.get("limit", 10))
    status = request.args.get("status", "")
    pool = get_pool()
    async with pool.acquire() as conn:
        if status:
            rows = await conn.fetch(
                """SELECT pj.id, pj.type, pj.label_type, pj.quantity, pj.status,
                          pj.created_at, pj.printed_at,
                          pv.sku, p.name as product_name
                   FROM print_jobs pj
                   LEFT JOIN product_variants pv ON pv.id = pj.variant_id
                   LEFT JOIN products p ON p.id = pv.product_id
                   WHERE pj.owner_id = $1 AND pj.status = $2
                   ORDER BY pj.created_at DESC LIMIT $3""",
                user_id, status, limit,
            )
        else:
            rows = await conn.fetch(
                """SELECT pj.id, pj.type, pj.label_type, pj.quantity, pj.status,
                          pj.created_at, pj.printed_at,
                          pv.sku, p.name as product_name
                   FROM print_jobs pj
                   LEFT JOIN product_variants pv ON pv.id = pj.variant_id
                   LEFT JOIN products p ON p.id = pv.product_id
                   WHERE pj.owner_id = $1
                   ORDER BY pj.created_at DESC LIMIT $2""",
                user_id, limit,
            )
    result = []
    for r in rows:
        d = dict(r)
        d["created_at"] = d["created_at"].isoformat()
        d["printed_at"] = d["printed_at"].isoformat() if d["printed_at"] else None
        result.append(d)
    return sanic_json(result)


@print_jobs_bp.route("/orders/pending", methods=["GET"])
async def pending_orders(request):
    user_id = request.ctx.user["user_id"]
    pool = get_pool()
    async with pool.acquire() as conn:
        orders = await conn.fetch(
            """SELECT wo.id, wo.woo_order_id, wo.raw_json, wo.imported_at, wo.status
               FROM woo_orders wo
               WHERE wo.owner_id = $1 AND wo.status = 'pending'
               ORDER BY wo.imported_at DESC""",
            user_id,
        )
        result = []
        for o in orders:
            od = dict(o)
            od["imported_at"] = od["imported_at"].isoformat()
            raw = od.get("raw_json") or {}
            if isinstance(raw, str):
                raw = json_module.loads(raw)
            od["customer_name"] = f"{raw.get('billing', {}).get('first_name', '')} {raw.get('billing', {}).get('last_name', '')}".strip()
            od["order_number"] = raw.get("number") or od["woo_order_id"]
            od["unmatched"] = raw.get("_unmatched", [])
            jobs = await conn.fetch(
                """SELECT pj.id, pj.quantity, pj.status, pv.sku, p.name as product_name
                   FROM print_jobs pj
                   LEFT JOIN product_variants pv ON pv.id = pj.variant_id
                   LEFT JOIN products p ON p.id = pv.product_id
                   WHERE pj.woo_order_id = $1""",
                o["id"],
            )
            od["jobs"] = [dict(j) for j in jobs]
            del od["raw_json"]
            result.append(od)
    return sanic_json(result)


@print_jobs_bp.route("/orders/<order_id>/print-all", methods=["POST"])
async def print_all_for_order(request, order_id):
    user_id = request.ctx.user["user_id"]
    pool = get_pool()
    async with pool.acquire() as conn:
        # Verify order ownership
        owned = await conn.fetchval(
            "SELECT id FROM woo_orders WHERE id=$1 AND owner_id=$2", order_id, user_id
        )
        if not owned:
            return sanic_json({"error": "Order not found"}, status=404)

        jobs = await conn.fetch(
            """SELECT pj.id, pj.label_type, pj.quantity, pj.extra_json,
                      pv.sku, pv.barcode, pv.weight_g, pv.price_gbp, pv.nutrition_json,
                      p.name as product_name, p.brand, p.description
               FROM print_jobs pj
               LEFT JOIN product_variants pv ON pv.id = pj.variant_id
               LEFT JOIN products p ON p.id = pv.product_id
               WHERE pj.woo_order_id = $1 AND pj.status = 'queued'""",
            order_id,
        )

    if not jobs:
        return sanic_json({"error": "No pending jobs for this order"}, status=404)

    combined = b""
    job_ids = []
    for job in jobs:
        params = {
            "product_name": job["product_name"] or "",
            "brand": job["brand"] or "",
            "description": job["description"] or "",
            "barcode": job["barcode"],
            "weight_g": float(job["weight_g"]) if job["weight_g"] else None,
            "price_gbp": float(job["price_gbp"]) if job["price_gbp"] else None,
            "nutrition_json": job["nutrition_json"],
        }
        try:
            image = render_label(job["label_type"], params)
            raster = image_to_raster_bytes(image)
            for _ in range(job["quantity"]):
                combined += raster
            job_ids.append(str(job["id"]))
        except Exception as e:
            logger.error("Error rendering job %s: %s", job["id"], e)

    return HTTPResponse(
        body=combined,
        status=200,
        content_type="application/octet-stream",
        headers={"X-Job-Ids": ",".join(job_ids)},
    )
