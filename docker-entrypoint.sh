#!/bin/sh
set -e

echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma

echo "Running seed (idempotent)..."
node node_modules/.bin/tsx prisma/seed.ts || true

echo "Starting application..."
exec node server.js
