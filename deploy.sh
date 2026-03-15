#!/usr/bin/env bash
set -e

echo "Pulling latest code..."
git pull

echo "Rebuilding and restarting containers..."
docker compose up --build -d

echo "Done. App running on 100.101.66.103:8000"
