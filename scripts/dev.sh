#!/usr/bin/env bash
set -euo pipefail

echo "=== SpikeClip Dev Environment ==="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Copy .env.example to .env first."
  exit 1
fi

echo "Building and starting all containers..."
echo "  - postgres (5432)"
echo "  - redis (6379)"
echo "  - minio (9000/9001)"
echo "  - api (3001)"
echo "  - web (3000)"
echo "  - nginx (80)"
echo ""

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

echo ""
echo "Waiting for services to be healthy..."
echo ""

# Wait for postgres
echo -n "  Postgres: "
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U spikeclips >/dev/null 2>&1; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "timeout"
  fi
  sleep 2
done

# Wait for redis
echo -n "  Redis: "
for i in $(seq 1 15); do
  if docker compose exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo "ready"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "timeout"
  fi
  sleep 2
done

# Run Prisma migrations
echo ""
echo "Running Prisma migrations..."
docker compose exec -T api pnpm --filter @spikeclip/api exec prisma migrate deploy 2>/dev/null || echo "  (migrations already applied or schema up to date)"

# Seed test user
echo ""
echo "Seeding test user..."
docker compose exec -T api npx ts-node prisma/seed.ts 2>/dev/null || echo "  (seed skipped — user may already exist)"

echo ""
echo "=== All services running ==="
echo ""
echo "  App:        http://localhost (via nginx)"
echo "  Web:        http://localhost:3000"
echo "  API:        http://localhost:3001"
echo "  Swagger:    http://localhost:3001/api/docs"
echo "  Postgres:   localhost:5432"
echo "  Redis:      localhost:6379"
echo "  MinIO:      http://localhost:9001 (console)"
echo ""
echo "  Logs:       docker compose logs -f"
echo "  Stop:       docker compose down"
echo ""
