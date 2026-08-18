#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Stopping SpikeClip ==="

echo "Stopping Nginx..."
sudo systemctl stop nginx || true

echo "Stopping web server..."
sudo systemctl stop spikeclip-web || true

echo "Stopping API server..."
sudo systemctl stop spikeclip-api || true

echo "Stopping infrastructure services..."
docker compose down

echo "=== All services stopped ==="
