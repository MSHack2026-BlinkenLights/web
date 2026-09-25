# Use this script to fill the local development database with dummy data
# for every table in prisma/schema.prisma (see prisma/seed.sql).
# Safe to run more than once: existing seed rows are left untouched.
# (native Windows PowerShell version of seed-database.sh, no WSL required)

# Requirements: database running (.\start-database.ps1), migrations applied
# (npm run db:migrate) and dependencies installed (npm install).

# Run this script from the project root:
#    powershell -ExecutionPolicy Bypass -File .\seed-database.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Test-Path (Join-Path $PSScriptRoot ".env"))) {
  Write-Host ".env file not found. Copy .env.example to .env and try again."
  exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "npx is not installed. Please install Node.js and try again."
  exit 1
}

& npx prisma db execute --file prisma/seed.sql --schema prisma/schema.prisma

if ($LASTEXITCODE -eq 0) {
  Write-Host "Dummy data was successfully seeded (login: jo@example.com / password123)"
} else {
  exit $LASTEXITCODE
}
