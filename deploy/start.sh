#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Starting SpikeClip ==="

echo "Starting infrastructure services..."
docker compose up -d postgres redis minio

echo "Waiting for services to be healthy..."
sleep 5

echo "Starting API server..."
sudo systemctl start spikeclip-api

echo "Starting web server..."
sudo systemctl start spikeclip-web

echo "Starting Nginx..."
sudo systemctl start nginx

echo "=== All services started ==="
echo "  API:   https://spikeclip.app/api"
echo "  Web:   https://spikeclip.app"
echo "  MinIO: http://localhost:9001 (console)"
