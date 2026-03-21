import json
from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool

label_template_bp = Blueprint("label_template", url_prefix="/api/label-template")

DEFAULT_TEMPLATE = {
    "width": 100,
    "height": 70,
    "unit": "mm",
    "elements": [
        {"id": "elem-1", "type": "text", "field": "product_name", "label": "Product Name",
         "x": 5, "y": 5, "width": 90, "height": 12, "enabled": True,
         "fontSize": 11, "fontWeight": "bold", "textAlign": "left"},
        {"id": "elem-2", "type": "barcode", "field": "barcode", "label": "Barcode",
         "x": 5, "y": 20, "width": 90, "height": 30, "enabled": True},
        {"id": "elem-3", "type": "text", "field": "sku", "label": "SKU",
         "x": 5, "y": 55, "width": 45, "height": 10, "enabled": True,
         "fontSize": 8, "fontWeight": "normal", "textAlign": "left"},
        {"id": "elem-4", "type": "text", "field": "price", "label": "Price",
         "x": 55, "y": 55, "width": 40, "height": 10, "enabled": True,
         "fontSize": 8, "fontWeight": "normal", "textAlign": "right"},
    ],
}


@label_template_bp.route("", methods=["GET"])
async def get_template(request):
    user = request.ctx.user
    org_id = user.get("org_id")
    if not org_id:
        return sanic_json({"error": "No organisation"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT template_json FROM label_templates WHERE org_id=$1", org_id
        )
        if not row:
            # Create default template
            await conn.execute(
                "INSERT INTO label_templates (org_id, template_json) VALUES ($1, $2)",
                org_id, json.dumps(DEFAULT_TEMPLATE)
            )
            return sanic_json({"template_json": DEFAULT_TEMPLATE})

    try:
        template = json.loads(row["template_json"])
    except Exception:
        template = DEFAULT_TEMPLATE
    return sanic_json({"template_json": template})


@label_template_bp.route("", methods=["PUT"])
async def save_template(request):
    user = request.ctx.user
    org_id = user.get("org_id")
    role = user.get("role")
    if not org_id:
        return sanic_json({"error": "No organisation"}, status=400)
    if role != "manager":
        return sanic_json({"error": "Manager role required"}, status=403)

    data = request.json or {}
    template_json = data.get("template_json")
    if not template_json:
        return sanic_json({"error": "template_json required"}, status=400)

    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO label_templates (org_id, template_json, updated_at)
               VALUES ($1, $2, NOW())
               ON CONFLICT (org_id) DO UPDATE
               SET template_json=$2, updated_at=NOW()""",
            org_id, json.dumps(template_json)
        )
    return sanic_json({"ok": True})
