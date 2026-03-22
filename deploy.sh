#!/usr/bin/env bash
set -euo pipefail

if ! command -v tailscale >/dev/null 2>&1; then
  echo "tailscale CLI not found; cannot determine Tailscale IP" >&2
  exit 1
fi

TAILSCALE_IP="${TAILSCALE_IP:-$(tailscale ip -4 | head -n1)}"
if [[ -z "${TAILSCALE_IP}" ]]; then
  echo "No Tailscale IPv4 address found on this host" >&2
  exit 1
fi

export TAILSCALE_IP

echo "Pulling latest code..."
git pull

echo "Rebuilding and restarting containers..."
docker compose up --build -d

echo "Waiting for app container to become healthy..."
sleep 3
docker compose ps

echo "Recent app logs:"
docker compose logs --tail=50 app

echo "Done. App should be reachable at http://${TAILSCALE_IP}:8000"
