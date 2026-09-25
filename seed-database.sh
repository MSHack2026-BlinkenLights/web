#!/usr/bin/env bash
# Use this script to fill the local development database with dummy data
# for every table in prisma/schema.prisma (see prisma/seed.sql).
# Safe to run more than once: existing seed rows are left untouched.

# Requirements: database running (./start-database.sh), migrations applied
# (npm run db:migrate) and dependencies installed (npm install).

# On Linux and macOS run this script directly - `./seed-database.sh`

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo ".env file not found. Copy .env.example to .env and try again."
  exit 1
fi

if ! [ -x "$(command -v npx)" ]; then
  echo "npx is not installed. Please install Node.js and try again."
  exit 1
fi

npx prisma db execute --file prisma/seed.sql --schema prisma/schema.prisma
echo "Dummy data was successfully seeded (login: jo@example.com / password123)"
