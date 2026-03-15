import json as json_module
from sanic import Blueprint
from sanic.response import json as sanic_json
from ..db import get_pool

products_bp = Blueprint("products", url_prefix="/api")


# ── Tags ──────────────────────────────────────────────────────────────────────

@products_bp.route("/tags", methods=["GET"])
async def list_tags(request):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, colour FROM tags WHERE org_id=$1 ORDER BY name",
            org_id,
        )
    return sanic_json([dict(r) for r in rows])


@products_bp.route("/tags", methods=["POST"])
async def create_tag(request):
    org_id = request.ctx.user.get("org_id")
    user_id = request.ctx.user["user_id"]
    data = request.json or {}
    name = data.get("name", "").strip()
    colour = data.get("colour", "#E8470A").strip()
    if not name:
        return sanic_json({"error": "Name required"}, status=400)
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO tags (name, colour, owner_id, org_id) VALUES ($1, $2, $3, $4) RETURNING id, name, colour",
            name, colour, user_id, org_id,
        )
    return sanic_json(dict(row), status=201)


@products_bp.route("/tags/<tag_id>", methods=["PUT"])
async def update_tag(request, tag_id):
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    name = data.get("name", "").strip()
    colour = data.get("colour", "").strip()
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE tags SET name=COALESCE(NULLIF($1,''), name), colour=COALESCE(NULLIF($2,''), colour) WHERE id=$3 AND org_id=$4 RETURNING id, name, colour",
            name, colour, tag_id, org_id,
        )
    if not row:
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json(dict(row))


@products_bp.route("/tags/<tag_id>", methods=["DELETE"])
async def delete_tag(request, tag_id):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM tags WHERE id=$1 AND org_id=$2", tag_id, org_id)
    if result == "DELETE 0":
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json({"ok": True})


# ── Products ──────────────────────────────────────────────────────────────────

@products_bp.route("/products", methods=["GET"])
async def list_products(request):
    org_id = request.ctx.user.get("org_id")
    search = request.args.get("search", "").strip()
    tag_id = request.args.get("tag_id", "").strip()
    pool = get_pool()
    async with pool.acquire() as conn:
        if tag_id:
            rows = await conn.fetch(
                """
                SELECT DISTINCT p.id, p.name, p.description, p.brand, p.created_at
                FROM products p
                JOIN product_tags pt ON pt.product_id = p.id
                WHERE p.org_id = $1 AND pt.tag_id = $2
                  AND ($3 = '' OR p.name ILIKE '%' || $3 || '%' OR p.brand ILIKE '%' || $3 || '%')
                ORDER BY p.name
                """,
                org_id, tag_id, search,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT id, name, description, brand, created_at
                FROM products
                WHERE org_id = $1
                  AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR brand ILIKE '%' || $2 || '%')
                ORDER BY name
                """,
                org_id, search,
            )
        products = []
        for r in rows:
            p = dict(r)
            p["created_at"] = p["created_at"].isoformat()
            tags = await conn.fetch(
                "SELECT t.id, t.name, t.colour FROM tags t JOIN product_tags pt ON pt.tag_id=t.id WHERE pt.product_id=$1",
                p["id"],
            )
            p["tags"] = [dict(t) for t in tags]
            variant_count = await conn.fetchval("SELECT COUNT(*) FROM product_variants WHERE product_id=$1", p["id"])
            p["variant_count"] = variant_count
            products.append(p)
    return sanic_json(products)


@products_bp.route("/products", methods=["POST"])
async def create_product(request):
    org_id = request.ctx.user.get("org_id")
    user_id = request.ctx.user["user_id"]
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return sanic_json({"error": "Name required"}, status=400)
    description = data.get("description", "")
    brand = data.get("brand", "")
    tag_ids = data.get("tag_ids", [])

    pool = get_pool()
    async with pool.acquire() as conn:
        # Check product limit
        plan = await conn.fetchrow(
            """SELECT p.product_limit FROM plans p
               JOIN organizations o ON o.plan_id=p.id WHERE o.id=$1""",
            org_id,
        )
        count = await conn.fetchval("SELECT COUNT(*) FROM products WHERE org_id=$1", org_id)
        if plan and count >= plan["product_limit"] * 1.1:
            return sanic_json({"error": "Product limit reached. Upgrade your plan.", "limit_hit": True}, status=402)

        async with conn.transaction():
            row = await conn.fetchrow(
                "INSERT INTO products (name, description, brand, owner_id, org_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, brand, created_at",
                name, description, brand, user_id, org_id,
            )
            product_id = row["id"]
            for tid in tag_ids:
                await conn.execute(
                    "INSERT INTO product_tags (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    product_id, tid,
                )
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    result["tags"] = []
    return sanic_json(result, status=201)


@products_bp.route("/products/<product_id>", methods=["GET"])
async def get_product(request, product_id):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, name, description, brand, created_at FROM products WHERE id=$1 AND org_id=$2",
            product_id, org_id,
        )
        if not row:
            return sanic_json({"error": "Not found"}, status=404)
        p = dict(row)
        p["created_at"] = p["created_at"].isoformat()
        tags = await conn.fetch(
            "SELECT t.id, t.name, t.colour FROM tags t JOIN product_tags pt ON pt.tag_id=t.id WHERE pt.product_id=$1",
            product_id,
        )
        p["tags"] = [dict(t) for t in tags]
        variants = await conn.fetch(
            "SELECT id, sku, barcode, weight_g, price_gbp, nutrition_json, is_active, created_at FROM product_variants WHERE product_id=$1 ORDER BY created_at",
            product_id,
        )
        p["variants"] = []
        for v in variants:
            vd = dict(v)
            vd["weight_g"] = float(vd["weight_g"]) if vd["weight_g"] is not None else None
            vd["price_gbp"] = float(vd["price_gbp"]) if vd["price_gbp"] is not None else None
            vd["created_at"] = vd["created_at"].isoformat()
            if vd["nutrition_json"] and isinstance(vd["nutrition_json"], str):
                vd["nutrition_json"] = json_module.loads(vd["nutrition_json"])
            p["variants"].append(vd)
    return sanic_json(p)


@products_bp.route("/products/<product_id>", methods=["PUT"])
async def update_product(request, product_id):
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    name = data.get("name", "").strip()
    description = data.get("description", "")
    brand = data.get("brand", "")
    tag_ids = data.get("tag_ids", None)
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                """UPDATE products SET
                    name = COALESCE(NULLIF($1,''), name),
                    description = $2,
                    brand = $3
                WHERE id=$4 AND org_id=$5 RETURNING id, name, description, brand, created_at""",
                name, description, brand, product_id, org_id,
            )
            if not row:
                return sanic_json({"error": "Not found"}, status=404)
            if tag_ids is not None:
                await conn.execute("DELETE FROM product_tags WHERE product_id=$1", product_id)
                for tid in tag_ids:
                    await conn.execute(
                        "INSERT INTO product_tags (product_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                        product_id, tid,
                    )
    result = dict(row)
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result)


@products_bp.route("/products/<product_id>", methods=["DELETE"])
async def delete_product(request, product_id):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM products WHERE id=$1 AND org_id=$2", product_id, org_id)
    if result == "DELETE 0":
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json({"ok": True})


# ── Variants ──────────────────────────────────────────────────────────────────

@products_bp.route("/products/<product_id>/variants", methods=["POST"])
async def create_variant(request, product_id):
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    sku = data.get("sku", "").strip()
    if not sku:
        return sanic_json({"error": "SKU required"}, status=400)
    pool = get_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval(
            "SELECT id FROM products WHERE id=$1 AND org_id=$2", product_id, org_id
        )
        if not exists:
            return sanic_json({"error": "Product not found"}, status=404)
        nutrition = data.get("nutrition_json")
        row = await conn.fetchrow(
            """INSERT INTO product_variants (product_id, sku, barcode, weight_g, price_gbp, nutrition_json, is_active)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
            RETURNING id, sku, barcode, weight_g, price_gbp, nutrition_json, is_active, created_at""",
            product_id, sku, data.get("barcode"), data.get("weight_g"), data.get("price_gbp"),
            json_module.dumps(nutrition) if nutrition else None,
            data.get("is_active", True),
        )
    result = dict(row)
    result["weight_g"] = float(result["weight_g"]) if result["weight_g"] is not None else None
    result["price_gbp"] = float(result["price_gbp"]) if result["price_gbp"] is not None else None
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result, status=201)


@products_bp.route("/variants/<variant_id>", methods=["PUT"])
async def update_variant(request, variant_id):
    org_id = request.ctx.user.get("org_id")
    data = request.json or {}
    nutrition = data.get("nutrition_json")
    pool = get_pool()
    async with pool.acquire() as conn:
        # Verify ownership via the parent product's org_id
        owned = await conn.fetchval(
            """SELECT pv.id FROM product_variants pv
               JOIN products p ON p.id = pv.product_id
               WHERE pv.id=$1 AND p.org_id=$2""",
            variant_id, org_id,
        )
        if not owned:
            return sanic_json({"error": "Not found"}, status=404)
        row = await conn.fetchrow(
            """UPDATE product_variants SET
                sku = COALESCE(NULLIF($1,''), sku),
                barcode = $2,
                weight_g = $3,
                price_gbp = $4,
                nutrition_json = $5::jsonb,
                is_active = COALESCE($6, is_active)
            WHERE id=$7
            RETURNING id, sku, barcode, weight_g, price_gbp, nutrition_json, is_active, created_at""",
            data.get("sku", ""), data.get("barcode"), data.get("weight_g"), data.get("price_gbp"),
            json_module.dumps(nutrition) if nutrition else None,
            data.get("is_active"), variant_id,
        )
    result = dict(row)
    result["weight_g"] = float(result["weight_g"]) if result["weight_g"] is not None else None
    result["price_gbp"] = float(result["price_gbp"]) if result["price_gbp"] is not None else None
    result["created_at"] = result["created_at"].isoformat()
    return sanic_json(result)


@products_bp.route("/variants/<variant_id>", methods=["DELETE"])
async def delete_variant(request, variant_id):
    org_id = request.ctx.user.get("org_id")
    pool = get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """DELETE FROM product_variants WHERE id=$1
               AND product_id IN (SELECT id FROM products WHERE org_id=$2)""",
            variant_id, org_id,
        )
    if result == "DELETE 0":
        return sanic_json({"error": "Not found"}, status=404)
    return sanic_json({"ok": True})
