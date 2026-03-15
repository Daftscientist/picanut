#!/usr/bin/env python3
"""
LabelFlow Print Agent
=====================
Runs on your local Windows machine. Connects outbound to your LabelFlow
server and waits for print jobs. Print from any browser, any network.

Usage:
    pip install aiohttp pywin32
    python print_agent.py --url wss://yourdomain.com --token YOUR_AGENT_TOKEN

Or set environment variables:
    LABELFLOW_URL=wss://yourdomain.com
    LABELFLOW_TOKEN=your-agent-token

To run without a visible window, install as a Windows service with NSSM
using pythonw.exe — see the README for instructions.
"""

import asyncio
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

RECONNECT_DELAY = 5
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
    ws_url = f"{server_url}/api/ws/agent?token={token}"
    log(f"Connecting to {server_url} ...")

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    connector = aiohttp.TCPConnector(ssl=ssl_ctx)
    async with aiohttp.ClientSession(connector=connector) as session:
        async with session.ws_connect(ws_url, heartbeat=30, compress=0) as ws:
            log("Connected. Waiting for print jobs.")

            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    try:
                        cmd = json.loads(msg.data)
                    except Exception:
                        continue

                    command = cmd.get("cmd")
                    job_id = cmd.get("job_id", "")

                    if command == "list_printers":
                        try:
                            printers = list_printers()
                            await ws.send_str(json.dumps({"printers": printers, "job_id": job_id}))
                            log(f"Sent printer list ({len(printers)} printers)")
                        except Exception as exc:
                            await ws.send_str(json.dumps({"error": str(exc), "job_id": job_id}))

                    elif command == "print":
                        printer_name = cmd.get("printer", "")
                        log(f"Print job received → '{printer_name}'")

                        # Next message is the binary raster data
                        try:
                            next_msg = await asyncio.wait_for(ws.receive(), timeout=10)
                        except asyncio.TimeoutError:
                            await ws.send_str(json.dumps({"error": "Timed out waiting for data", "job_id": job_id}))
                            continue

                        if next_msg.type != aiohttp.WSMsgType.BINARY:
                            await ws.send_str(json.dumps({"error": "Expected binary data", "job_id": job_id}))
                            continue

                        payload = next_msg.data
                        log(f"  {len(payload):,} bytes — printing...")
                        try:
                            send_to_printer(printer_name, payload)
                            await ws.send_str(json.dumps({"status": "ok", "job_id": job_id}))
                            log("  Done.")
                        except Exception as exc:
                            log(f"  FAILED: {exc}")
                            await ws.send_str(json.dumps({"error": str(exc), "job_id": job_id}))

                elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                    raise Exception(f"WebSocket closed: {msg.data}")


async def main(server_url: str, token: str):
    while True:
        try:
            await run(server_url, token)
        except Exception as exc:
            log(f"Disconnected: {exc}. Reconnecting in {RECONNECT_DELAY}s...")
            await asyncio.sleep(RECONNECT_DELAY)


if __name__ == "__main__":
    args = sys.argv[1:]

    def get_arg(flag, env_var, default=""):
        if flag in args:
            return args[args.index(flag) + 1]
        return os.environ.get(env_var, default)

    server_url = get_arg("--url", "LABELFLOW_URL", "").rstrip("/")
    token = get_arg("--token", "LABELFLOW_TOKEN", "")

    if not server_url:
        print("Error: provide --url wss://yourdomain.com or set LABELFLOW_URL")
        sys.exit(1)
    if not token:
        print("Error: provide --token YOUR_TOKEN or set LABELFLOW_TOKEN")
        sys.exit(1)

    server_url = server_url.replace("https://", "wss://").replace("http://", "ws://")

    log("=" * 52)
    log("  LabelFlow Print Agent")
    log(f"  Server: {server_url}")
    log(f"  Log:    {LOG_FILE}")
    log("=" * 52)

    try:
        asyncio.run(main(server_url, token))
    except KeyboardInterrupt:
        log("Agent stopped.")
