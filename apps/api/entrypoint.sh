#!/bin/sh
set -e

echo "Waiting for database to be ready..."

# Extract host and port from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# Wait for database to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U spikeclip > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database is ready!"

echo "Running database migrations..."
pnpm exec prisma migrate deploy

echo "Starting API server..."
# Add debugging
echo "Server starting on port 3001..."
exec node dist/main