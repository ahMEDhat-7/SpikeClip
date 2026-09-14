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
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL: $DATABASE_URL"

# Start server in background to check if it starts
node dist/main &
SERVER_PID=$!

# Wait a bit for server to start
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "Server process is running (PID: $SERVER_PID)"
  # Test health endpoint
  if curl -f http://localhost:3001/health; then
    echo "Health check passed!"
  else
    echo "Health check failed!"
  fi
else
  echo "Server process died!"
  exit 1
fi

# Wait for server process
wait $SERVER_PID