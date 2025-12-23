#!/bin/sh
set -e

echo "Starting application..."

# Set database path
export DATABASE_URL="file:/app/data/dev.db"

# Check if database exists, if not run migrations
if [ ! -f /app/data/dev.db ]; then
  echo "Database not found. Running Prisma migrations..."
  npx prisma migrate deploy
  echo "Database initialized successfully!"
else
  echo "Database found. Running migrations if any..."
  npx prisma migrate deploy
fi

# Start the Next.js server
echo "Starting Next.js server..."
exec node server.js
