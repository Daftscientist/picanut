import os
import sys
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
