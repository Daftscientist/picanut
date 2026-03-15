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
from sanic.response import json as sanic_json, file as sanic_file, HTTPResponse
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
    app.ctx.agent_queue = asyncio.Queue()
    app.ctx.agent_result_futures = {}
    app.ctx.agent_last_seen = None
    app.ctx.agent_token = None

    logger.info("Running database migrations...")
    run_migrations()

    logger.info("Creating database pool...")
    await create_pool()

    logger.info("Ensuring default admin user...")
    await ensure_admin_user()

    logger.info("Ensuring agent token...")
    app.ctx.agent_token = await ensure_agent_token()

    logger.info("Server ready.")


@app.listener("after_server_stop")
async def teardown(app, loop):
    await close_pool()


# ── Agent long-poll (agent calls this, blocks up to 25s) ─────────────────────

@app.get("/api/agent/poll")
async def agent_poll(request):
    token = request.args.get("token", "")
    if not token or token != app.ctx.agent_token:
        return sanic_json({"error": "Unauthorized"}, status=401)

    app.ctx.agent_last_seen = asyncio.get_event_loop().time()
    try:
        cmd = await asyncio.wait_for(app.ctx.agent_queue.get(), timeout=25.0)
        app.ctx.agent_last_seen = asyncio.get_event_loop().time()
        return sanic_json(cmd)
    except asyncio.TimeoutError:
        app.ctx.agent_last_seen = asyncio.get_event_loop().time()
        return sanic_json({"cmd": "ping"})


# ── Agent result submission ───────────────────────────────────────────────────

@app.post("/api/agent/result")
async def agent_result(request):
    token = request.args.get("token", "")
    if not token or token != app.ctx.agent_token:
        return sanic_json({"error": "Unauthorized"}, status=401)

    app.ctx.agent_last_seen = asyncio.get_event_loop().time()
    data = request.json or {}
    job_id = data.get("job_id")
    if job_id and job_id in app.ctx.agent_result_futures:
        fut = app.ctx.agent_result_futures[job_id]
        if not fut.done():
            fut.set_result(data)
    return sanic_json({"ok": True})


# ── Agent status ──────────────────────────────────────────────────────────────

@app.get("/api/agent/status")
async def agent_status(request):
    last = app.ctx.agent_last_seen
    connected = last is not None and (asyncio.get_event_loop().time() - last) < 35
    return sanic_json({"connected": connected, "token": app.ctx.agent_token})


# ── Printer list ──────────────────────────────────────────────────────────────

@app.get("/api/printers")
async def get_printers(request):
    last = app.ctx.agent_last_seen
    if last is None or (asyncio.get_event_loop().time() - last) >= 35:
        return sanic_json({"error": "No print agent connected"}, status=503)

    job_id = str(uuid.uuid4())
    fut = asyncio.get_event_loop().create_future()
    app.ctx.agent_result_futures[job_id] = fut
    await app.ctx.agent_queue.put({"cmd": "list_printers", "job_id": job_id})
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
    last = app.ctx.agent_last_seen
    if last is None or (asyncio.get_event_loop().time() - last) >= 35:
        return sanic_json({"error": "No print agent connected. Is the agent running?"}, status=503)

    printer_name = request.headers.get("X-Printer-Name", "").strip()
    if not printer_name:
        return sanic_json({"error": "X-Printer-Name header required"}, status=400)
    raster_bytes = request.body
    if not raster_bytes:
        return sanic_json({"error": "No print data in request body"}, status=400)

    job_id = str(uuid.uuid4())
    fut = asyncio.get_event_loop().create_future()
    app.ctx.agent_result_futures[job_id] = fut
    await app.ctx.agent_queue.put({
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


async def ensure_agent_token():
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT value FROM app_settings WHERE key = 'agent_token'")
        if row:
            return row["value"]
        token = secrets.token_urlsafe(32)
        await conn.execute(
            "INSERT INTO app_settings (key, value) VALUES ('agent_token', $1)",
            token,
        )
        logger.info("Generated new agent token")
        return token


async def ensure_admin_user():
    pool = get_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM users")
        if count == 0:
            pw_hash = await hash_password("admin")
            await conn.execute(
                "INSERT INTO users (username, password_hash) VALUES ($1, $2)",
                "admin",
                pw_hash,
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
