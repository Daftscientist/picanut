#!/usr/bin/env python3
"""
LabelFlow Print Agent
=====================
Runs on your local Windows machine. Bridges LabelFlow (running on a remote
server) to your Brother QL printer over your local network via TCP port 9100.

Your USB driver stays intact — P-touch Editor continues to work normally.

Usage:
    pip install websockets
    python print_agent.py

Then set your printer IP in LabelFlow Settings and select Network mode.
Leave this window open while using LabelFlow.
"""

import asyncio
import socket
import sys
from urllib.parse import urlparse, parse_qs

try:
    import websockets
    from websockets.server import serve
except ImportError:
    print("Missing dependency. Run:  pip install websockets")
    sys.exit(1)

LISTEN_HOST = "localhost"
LISTEN_PORT = 9101
PRINTER_TCP_PORT = 9100


async def handle(websocket):
    # Printer IP is passed as a query param: ws://localhost:9101/?ip=192.168.x.x
    path = getattr(websocket, "path", "/")
    params = parse_qs(urlparse(path).query)
    printer_ip = params.get("ip", [None])[0]

    if not printer_ip:
        await websocket.close(1008, "Missing ?ip= query param")
        return

    print(f"  Client connected → printing to {printer_ip}:{PRINTER_TCP_PORT}")

    async for message in websocket:
        if not isinstance(message, bytes):
            continue
        print(f"  Received {len(message):,} bytes — sending to printer...", end=" ", flush=True)
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(8)
            sock.connect((printer_ip, PRINTER_TCP_PORT))
            sock.sendall(message)
            sock.close()
            await websocket.send("ok")
            print("done.")
        except Exception as exc:
            msg = f"Printer unreachable: {exc}"
            print(f"FAILED — {msg}")
            await websocket.send(f"error:{msg}")


async def main():
    port = LISTEN_PORT
    args = sys.argv[1:]
    if "--port" in args:
        idx = args.index("--port")
        port = int(args[idx + 1])

    print("=" * 50)
    print("  LabelFlow Print Agent")
    print(f"  Listening on ws://localhost:{port}")
    print("  Set your printer IP in LabelFlow → Settings")
    print("  Leave this window open while printing.")
    print("=" * 50)
    print()

    # origins=None disables origin checking so the browser (served from
    # a remote VPS domain) can connect to this localhost agent.
    async with serve(handle, LISTEN_HOST, port, origins=None):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAgent stopped.")
