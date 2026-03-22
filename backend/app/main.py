import os
import sys
import json
import uuid
import base64
import secrets
import logging
import subprocess
import asyncio

from sanic import Sanic
from sanic.response import json as sanic_json, file as sanic_file
from sanic_cors import CORS

from .config import config
from .db import create_pool, close_pool, get_pool
from .auth import auth_middleware, hash_password
from .routes.auth import auth_bp
from .routes.products import products_bp
from .routes.print_jobs import print_jobs_bp
from .routes.webhooks import webhooks_bp
from .routes.settings import settings_bp
from .routes.agents import agents_bp
from .routes.billing import billing_bp
from .routes.admin import admin_bp
from .routes.intelligence import intelligence_bp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("canopy")

app = Sanic("Canopy")
CORS(app, origins="*", automatic_options=True)

EXCLUDED_AUTH_PATHS = [
    "/api/auth/login",
    "/api/auth/signup",
    "/api/billing/plans",
    "/api/billing/webhook",
    "/api/webhooks/",
    "/api/agent/poll",
    "/api/agent/result",
]

app.blueprint(auth_bp)
app.blueprint(products_bp)
app.blueprint(print_jobs_bp)
app.blueprint(webhooks_bp)
app.blueprint(settings_bp)
app.blueprint(agents_bp)
app.blueprint(billing_bp)
app.blueprint(admin_bp)
app.blueprint(intelligence_bp)


@app.middleware("request")
async def check_auth(request):
    if not request.path.startswith("/api/"):
        return None
    return await auth_middleware(EXCLUDED_AUTH_PATHS)(request)


@app.middleware("response")
async def add_security_headers(request, response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https://images.unsplash.com; "
        "connect-src 'self';"
    )


@app.listener("before_server_start")
async def setup(app, loop):
    # Per-agent state (keyed by agent_id)
    app.ctx.token_to_agent = {}          # agent_token -> agent_id
    app.ctx.agent_queues = {}            # agent_id -> asyncio.Queue
    app.ctx.agent_last_seen = {}         # agent_id -> float
    app.ctx.agent_result_futures = {}    # job_id -> Future

    logger.info("Running database migrations...")
    run_migrations()

    logger.info("Creating database pool...")
    await create_pool()

    logger.info("Ensuring default admin user...")
    await ensure_admin_user()

    logger.info("Server ready.")


@app.listener("after_server_stop")
async def teardown(app, loop):
    await close_pool()


# ── Token → agent_id lookup (cached) ─────────────────────────────────────────

async def resolve_agent_token(token: str) -> str | None:
    """Return agent_id for the given agent token, or None if invalid."""
    if token in app.ctx.token_to_agent:
        return app.ctx.token_to_agent[token]
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id FROM agents WHERE token = $1", token)
    if row:
        agent_id = row["id"]
        app.ctx.token_to_agent[token] = agent_id
        return agent_id
    return None


def _agent_queue(agent_id: str) -> asyncio.Queue:
    if agent_id not in app.ctx.agent_queues:
        app.ctx.agent_queues[agent_id] = asyncio.Queue()
    return app.ctx.agent_queues[agent_id]


def _agent_connected(agent_id: str) -> bool:
    last = app.ctx.agent_last_seen.get(agent_id)
    return last is not None and (asyncio.get_event_loop().time() - last) < 35


# ── Agent long-poll ───────────────────────────────────────────────────────────

@app.get("/api/agent/poll")
async def agent_poll(request):
    token = request.args.get("token", "")
    agent_id = await resolve_agent_token(token)
    if not agent_id:
        return sanic_json({"error": "Unauthorized"}, status=401)

    app.ctx.agent_last_seen[agent_id] = asyncio.get_event_loop().time()
    try:
        cmd = await asyncio.wait_for(_agent_queue(agent_id).get(), timeout=25.0)
        app.ctx.agent_last_seen[agent_id] = asyncio.get_event_loop().time()
        return sanic_json(cmd)
    except asyncio.TimeoutError:
        app.ctx.agent_last_seen[agent_id] = asyncio.get_event_loop().time()
        return sanic_json({"cmd": "ping"})


# ── Agent result ──────────────────────────────────────────────────────────────

@app.post("/api/agent/result")
async def agent_result(request):
    token = request.args.get("token", "")
    agent_id = await resolve_agent_token(token)
    if not agent_id:
        return sanic_json({"error": "Unauthorized"}, status=401)

    app.ctx.agent_last_seen[agent_id] = asyncio.get_event_loop().time()
    data = request.json or {}
    job_id = data.get("job_id")
    if job_id and job_id in app.ctx.agent_result_futures:
        fut = app.ctx.agent_result_futures[job_id]
        if not fut.done():
            fut.set_result(data)
    return sanic_json({"ok": True})


# ── Agent status (for current logged-in user's org) ───────────────────────────

@app.get("/api/agent/status")
async def agent_status(request):
    org_id = request.ctx.user.get("org_id")
    if not org_id:
        return sanic_json({"agents": []})

    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, token, selected_printer, paper_size, is_default FROM agents WHERE org_id = $1",
            org_id,
        )

    agents = []
    for row in rows:
        d = dict(row)
        d["connected"] = _agent_connected(d["id"])
        agents.append(d)

    return sanic_json({"agents": agents})


# ── Printer list ───────────────────────────────────────────────────────────────

@app.get("/api/printers")
async def get_printers(request):
    user = request.ctx.user
    org_id = user.get("org_id")

    # Determine which agent to query
    agent_id = request.args.get("agent_id", "").strip()
    if not agent_id:
        # Try user's default agent
        agent_id = user.get("default_agent_id") or ""
    if not agent_id and org_id:
        # Fall back to org's default agent
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT default_agent_id FROM organizations WHERE id=$1", org_id
            )
        if row and row["default_agent_id"]:
            agent_id = row["default_agent_id"]

    if not agent_id:
        return sanic_json({"error": "No agent configured"}, status=503)

    if not _agent_connected(agent_id):
        return sanic_json({"error": "No print agent connected"}, status=503)

    job_id = str(uuid.uuid4())
    fut = asyncio.get_event_loop().create_future()
    app.ctx.agent_result_futures[job_id] = fut
    await _agent_queue(agent_id).put({"cmd": "list_printers", "job_id": job_id})
    try:
        result = await asyncio.wait_for(fut, timeout=30.0)
        return sanic_json({"printers": result.get("printers", [])})
    except asyncio.TimeoutError:
        return sanic_json({"error": "Agent timed out"}, status=504)
    except Exception as exc:
        return sanic_json({"error": str(exc)}, status=500)
    finally:
        app.ctx.agent_result_futures.pop(job_id, None)


# ── Dispatch print job ────────────────────────────────────────────────────────

@app.post("/api/print/dispatch")
async def dispatch_print(request):
    user = request.ctx.user
    org_id = user.get("org_id")

    # Determine which agent to use
    agent_id = request.headers.get("X-Agent-Id", "").strip()
    if not agent_id:
        agent_id = user.get("default_agent_id") or ""
    if not agent_id and org_id:
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT default_agent_id FROM organizations WHERE id=$1", org_id
            )
        if row and row["default_agent_id"]:
            agent_id = row["default_agent_id"]

    if not agent_id:
        return sanic_json({"error": "No agent configured for this organisation"}, status=503)

    if not _agent_connected(agent_id):
        return sanic_json({"error": "No print agent connected. Is the agent running?"}, status=503)

    # Printer: header override or agent's saved preference
    printer_name = request.headers.get("X-Printer-Name", "").strip()
    if not printer_name:
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT selected_printer FROM agents WHERE id=$1", agent_id
            )
        printer_name = (row["selected_printer"] or "").strip() if row else ""
    if not printer_name:
        return sanic_json({"error": "No printer selected. Configure one in Agents settings."}, status=400)

    raster_bytes = request.body
    if not raster_bytes:
        return sanic_json({"error": "No print data in request body"}, status=400)

    job_id = str(uuid.uuid4())
    fut = asyncio.get_event_loop().create_future()
    app.ctx.agent_result_futures[job_id] = fut
    await _agent_queue(agent_id).put({
        "cmd": "print",
        "job_id": job_id,
        "printer": printer_name,
        "data": base64.b64encode(raster_bytes).decode(),
    })
    try:
        result = await asyncio.wait_for(fut, timeout=30.0)
        if result.get("status") == "ok":
            return sanic_json({"status": "ok"})
        return sanic_json({"error": result.get("error", "Print failed")}, status=500)
    except asyncio.TimeoutError:
        return sanic_json({"error": "Print timed out"}, status=504)
    except Exception as exc:
        return sanic_json({"error": str(exc)}, status=500)
    finally:
        app.ctx.agent_result_futures.pop(job_id, None)


def run_migrations():
    migrations_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations")
    alembic_ini = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
    env = os.environ.copy()
    env["DATABASE_URL"] = config.DATABASE_URL
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", alembic_ini, "upgrade", "head"],
        env=env,
        capture_output=True,
        text=True,
        cwd=os.path.dirname(os.path.dirname(__file__)),
    )
    if result.returncode != 0:
        logger.error("Migration failed: %s", result.stderr)
        raise RuntimeError(f"Alembic migration failed: {result.stderr}")
    logger.info("Migrations applied: %s", result.stdout.strip() or "up to date")


async def ensure_admin_user():
    pool = get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM users")
        if count == 0:
            pw_hash = await hash_password("admin")
            org_id = await conn.fetchval("SELECT id FROM organizations WHERE slug='default'")
            await conn.execute(
                """INSERT INTO users (username, password_hash, is_admin, org_id, role, is_platform_admin)
                   VALUES ($1, $2, TRUE, $3, 'manager', TRUE)""",
                "admin", pw_hash, org_id,
            )
            logger.warning(
                "DEFAULT ADMIN USER CREATED — username: admin, password: admin. "
                "CHANGE THIS IMMEDIATELY via Settings."
            )


dist_dir = config.DIST_DIR

if os.path.isdir(dist_dir):
    app.static("/assets", os.path.join(dist_dir, "assets"), name="assets")
    app.static("/icons", os.path.join(dist_dir, "icons"), name="icons")

    @app.route("/manifest.json")
    async def serve_manifest(request):
        return await sanic_file(os.path.join(dist_dir, "manifest.json"))

    @app.route("/sw.js")
    async def serve_sw(request):
        return await sanic_file(os.path.join(dist_dir, "sw.js"))

    @app.route("/print_agent.py")
    async def serve_agent(request):
        return await sanic_file(
            os.path.join(dist_dir, "print_agent.py"),
            mime_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=print_agent.py"},
        )

    @app.route("/", name="serve_spa_root")
    async def serve_spa_root(request):
        return await sanic_file(os.path.join(dist_dir, "index.html"))

    @app.route("/<path:path>", name="serve_spa_path")
    async def serve_spa_path(request, path=""):
        if path.startswith("api/"):
            return sanic_json({"error": "Not found"}, status=404)
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.isfile(index_file):
            return await sanic_file(index_file)
        return sanic_json({"error": "Frontend not built"}, status=404)
else:
    @app.route("/")
    async def no_frontend(request):
        return sanic_json({"message": "Canopy BMS API running. Frontend not built."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, single_process=True, fast=False)
