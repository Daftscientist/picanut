#!/usr/bin/env python3
"""
LabelFlow Print Agent
=====================
Runs on your local Windows machine. Polls the LabelFlow server for print jobs
over plain HTTPS — works through any proxy without WebSocket issues.

Usage:
    pip install aiohttp pywin32
    python print_agent.py --url https://yourdomain.com --token YOUR_AGENT_TOKEN

Or set environment variables:
    LABELFLOW_URL=https://yourdomain.com
    LABELFLOW_TOKEN=your-agent-token
"""

import asyncio
import base64
import json
import os
import ssl
import sys
import time

try:
    import aiohttp
except ImportError:
    print("Missing dependency. Run:  pip install aiohttp")
    sys.exit(1)

try:
    import win32print
except ImportError:
    print("Missing dependency. Run:  pip install pywin32")
    sys.exit(1)

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "print_agent.log")


def log(msg):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def list_printers():
    printers = win32print.EnumPrinters(
        win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS,
        None, 2
    )
    return [p["pPrinterName"] for p in printers]


def send_to_printer(printer_name: str, data: bytes):
    handle = win32print.OpenPrinter(printer_name)
    try:
        win32print.StartDocPrinter(handle, 1, ("LabelFlow", None, "RAW"))
        try:
            win32print.StartPagePrinter(handle)
            win32print.WritePrinter(handle, data)
            win32print.EndPagePrinter(handle)
        finally:
            win32print.EndDocPrinter(handle)
    finally:
        win32print.ClosePrinter(handle)


async def run(server_url: str, token: str):
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    poll_url = f"{server_url}/api/agent/poll?token={token}"
    result_url = f"{server_url}/api/agent/result?token={token}"

    connector = aiohttp.TCPConnector(ssl=ssl_ctx)
    # poll timeout slightly over server hold time (25s) plus buffer
    timeout = aiohttp.ClientTimeout(total=35, connect=10)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        log(f"Polling {server_url} ...")

        while True:
            try:
                async with session.get(poll_url) as resp:
                    if resp.status == 401:
                        log("ERROR: Invalid token — check your --token argument")
                        await asyncio.sleep(30)
                        continue
                    if resp.status != 200:
                        log(f"Server returned {resp.status}, retrying...")
                        await asyncio.sleep(5)
                        continue
                    cmd = await resp.json()

            except asyncio.TimeoutError:
                # Normal — server held 25s with no jobs, just poll again
                continue
            except Exception as exc:
                log(f"Poll error: {exc}. Retrying in 5s...")
                await asyncio.sleep(5)
                continue

            command = cmd.get("cmd")
            job_id = cmd.get("job_id", "")

            if command == "ping":
                continue  # keepalive, loop immediately

            elif command == "list_printers":
                try:
                    printers = list_printers()
                    async with session.post(result_url, json={"job_id": job_id, "printers": printers}):
                        pass
                    log(f"Sent printer list ({len(printers)} printers)")
                except Exception as exc:
                    async with session.post(result_url, json={"job_id": job_id, "error": str(exc)}):
                        pass

            elif command == "print":
                printer = cmd.get("printer", "")
                data_b64 = cmd.get("data", "")
                log(f"Print job → '{printer}'")
                try:
                    data = base64.b64decode(data_b64)
                    log(f"  {len(data):,} bytes — printing...")
                    send_to_printer(printer, data)
                    async with session.post(result_url, json={"job_id": job_id, "status": "ok"}):
                        pass
                    log("  Done.")
                except Exception as exc:
                    log(f"  FAILED: {exc}")
                    async with session.post(result_url, json={"job_id": job_id, "error": str(exc)}):
                        pass


async def main(server_url: str, token: str):
    log("=" * 52)
    log("  LabelFlow Print Agent")
    log(f"  Server: {server_url}")
    log(f"  Log:    {LOG_FILE}")
    log("=" * 52)

    while True:
        try:
            await run(server_url, token)
        except Exception as exc:
            log(f"Unexpected error: {exc}. Restarting in 5s...")
            await asyncio.sleep(5)


if __name__ == "__main__":
    args = sys.argv[1:]

    def get_arg(flag, env_var, default=""):
        if flag in args:
            return args[args.index(flag) + 1]
        return os.environ.get(env_var, default)

    server_url = get_arg("--url", "LABELFLOW_URL", "").rstrip("/")
    token = get_arg("--token", "LABELFLOW_TOKEN", "")

    if not server_url:
        print("Error: provide --url https://yourdomain.com or set LABELFLOW_URL")
        sys.exit(1)
    if not token:
        print("Error: provide --token YOUR_TOKEN or set LABELFLOW_TOKEN")
        sys.exit(1)

    # Normalise: wss/ws → https/http (we use plain HTTP now)
    server_url = server_url.replace("wss://", "https://").replace("ws://", "http://")

    try:
        asyncio.run(main(server_url, token))
    except KeyboardInterrupt:
        log("Agent stopped.")
