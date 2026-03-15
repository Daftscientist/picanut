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

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("labelflow")

app = Sanic("LabelFlow")
CORS(app, origins="*", automatic_options=True)

EXCLUDED_AUTH_PATHS = [
    "/api/auth/login",
    "/api/webhooks/",
    "/api/agent/",
]

app.blueprint(auth_bp)
app.blueprint(products_bp)
app.blueprint(print_jobs_bp)
app.blueprint(webhooks_bp)
app.blueprint(settings_bp)


@app.middleware("request")
async def check_auth(request):
    if not request.path.startswith("/api/"):
        return None
    return await auth_middleware(EXCLUDED_AUTH_PATHS)(request)


@app.listener("before_server_start")
async def setup(app, loop):
    # Per-user agent state
    app.ctx.agent_queues = {}          # user_id -> asyncio.Queue
    app.ctx.agent_last_seen = {}       # user_id -> float
    app.ctx.agent_result_futures = {}  # job_id  -> Future
    app.ctx.token_to_user = {}         # agent_token -> user_id (in-memory cache)

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


# ── Token → user lookup (cached) ─────────────────────────────────────────────

async def resolve_agent_token(token: str):
    """Return user_id for the given agent token, or None if invalid."""
    if token in app.ctx.token_to_user:
        return app.ctx.token_to_user[token]
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT user_id FROM user_settings WHERE agent_token = $1", token
        )
    if row:
        uid = row["user_id"]
        app.ctx.token_to_user[token] = uid
        return uid
    return None


def _agent_queue(user_id: str) -> asyncio.Queue:
    if user_id not in app.ctx.agent_queues:
        app.ctx.agent_queues[user_id] = asyncio.Queue()
    return app.ctx.agent_queues[user_id]


def _agent_connected(user_id: str) -> bool:
    last = app.ctx.agent_last_seen.get(user_id)
    return last is not None and (asyncio.get_event_loop().time() - last) < 35


# ── Agent long-poll ───────────────────────────────────────────────────────────

@app.get("/api/agent/poll")
async def agent_poll(request):
    token = request.args.get("token", "")
    user_id = await resolve_agent_token(token)
    if not user_id:
        return sanic_json({"error": "Unauthorized"}, status=401)

    app.ctx.agent_last_seen[user_id] = asyncio.get_event_loop().time()
    try:
        cmd = await asyncio.wait_for(_agent_queue(user_id).get(), timeout=25.0)
        app.ctx.agent_last_seen[user_id] = asyncio.get_event_loop().time()
        return sanic_json(cmd)
    except asyncio.TimeoutError:
        app.ctx.agent_last_seen[user_id] = asyncio.get_event_loop().time()
        return sanic_json({"cmd": "ping"})


# ── Agent result ──────────────────────────────────────────────────────────────

@app.post("/api/agent/result")
async def agent_result(request):
    token = request.args.get("token", "")
    user_id = await resolve_agent_token(token)
    if not user_id:
        return sanic_json({"error": "Unauthorized"}, status=401)

    app.ctx.agent_last_seen[user_id] = asyncio.get_event_loop().time()
    data = request.json or {}
    job_id = data.get("job_id")
    if job_id and job_id in app.ctx.agent_result_futures:
        fut = app.ctx.agent_result_futures[job_id]
        if not fut.done():
            fut.set_result(data)
    return sanic_json({"ok": True})


# ── Agent status (for current logged-in user) ─────────────────────────────────

@app.get("/api/agent/status")
async def agent_status(request):
    user_id = request.ctx.user["user_id"]
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT agent_token, selected_printer FROM user_settings WHERE user_id = $1",
            user_id,
        )
    token = row["agent_token"] if row else None
    printer = row["selected_printer"] if row else None
    return sanic_json({
        "connected": _agent_connected(user_id),
        "agent_token": token,
        "selected_printer": printer,
    })


# ── Printer list (for current user's agent) ───────────────────────────────────

@app.get("/api/printers")
async def get_printers(request):
    user_id = request.ctx.user["user_id"]
    if not _agent_connected(user_id):
        return sanic_json({"error": "No print agent connected"}, status=503)

    job_id = str(uuid.uuid4())
    fut = asyncio.get_event_loop().create_future()
    app.ctx.agent_result_futures[job_id] = fut
    await _agent_queue(user_id).put({"cmd": "list_printers", "job_id": job_id})
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
    user_id = request.ctx.user["user_id"]
    if not _agent_connected(user_id):
        return sanic_json({"error": "No print agent connected. Is the agent running?"}, status=503)

    # Printer: header override or user's saved preference
    printer_name = request.headers.get("X-Printer-Name", "").strip()
    if not printer_name:
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT selected_printer FROM user_settings WHERE user_id = $1", user_id
            )
        printer_name = (row["selected_printer"] or "").strip() if row else ""
    if not printer_name:
        return sanic_json({"error": "No printer selected. Choose one in Settings."}, status=400)

    raster_bytes = request.body
    if not raster_bytes:
        return sanic_json({"error": "No print data in request body"}, status=400)

    job_id = str(uuid.uuid4())
    fut = asyncio.get_event_loop().create_future()
    app.ctx.agent_result_futures[job_id] = fut
    await _agent_queue(user_id).put({
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
            await conn.execute(
                "INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, TRUE)",
                "admin", pw_hash,
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
        return sanic_json({"message": "LabelFlow API running. Frontend not built."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, single_process=True, fast=False)
