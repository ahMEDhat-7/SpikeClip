#!/bin/sh
set -e

echo "Generating Prisma client..."
pnpm exec prisma generate --schema=./prisma/schema.prisma

echo "Running Prisma migrations..."
if ! pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma; then
  echo "ERROR: Prisma migrations failed. Check database connectivity and migration state." >&2
  exit 1
fi

echo "Starting API server..."
exec node dist/main
