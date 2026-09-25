# Use this script to start a docker container for a local development database
# (native Windows PowerShell version of start-database.sh, no WSL required)

# TO RUN ON WINDOWS:
# 1. Install Docker Desktop or Podman Desktop
# - Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# - Podman Desktop - https://podman.io/getting-started/installation
# 2. Run this script from the project root:
#    powershell -ExecutionPolicy Bypass -File .\start-database.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
  Write-Host ".env file not found. Copy .env.example to .env and try again."
  exit 1
}

# import DATABASE_URL from .env
$databaseUrl = $null
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*DATABASE_URL\s*=\s*["'']?([^"'']*)["'']?\s*$') {
    $databaseUrl = $Matches[1]
  }
}

if (-not $databaseUrl) {
  Write-Host "DATABASE_URL is not set in .env. Please set it and try again."
  exit 1
}

# postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
if ($databaseUrl -notmatch '^postgres(?:ql)?://[^:]+:([^@]*)@[^:/]+:(\d+)/([^?]+)') {
  Write-Host "Could not parse DATABASE_URL. Expected format: postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
  exit 1
}
$DB_PASSWORD = $Matches[1]
$DB_PORT = [int]$Matches[2]
$DB_NAME = $Matches[3]
$DB_CONTAINER_NAME = "$DB_NAME-postgres"

# determine which docker command to use
if (Get-Command docker -ErrorAction SilentlyContinue) {
  $DOCKER_CMD = "docker"
} elseif (Get-Command podman -ErrorAction SilentlyContinue) {
  $DOCKER_CMD = "podman"
} else {
  Write-Host "Docker or Podman is not installed. Please install docker or podman and try again."
  Write-Host "Docker install guide: https://docs.docker.com/engine/install/"
  Write-Host "Podman install guide: https://podman.io/getting-started/installation"
  exit 1
}

& $DOCKER_CMD info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "$DOCKER_CMD daemon is not running. Please start $DOCKER_CMD and try again."
  exit 1
}

if (& $DOCKER_CMD ps -q -f "name=$DB_CONTAINER_NAME") {
  Write-Host "Database container '$DB_CONTAINER_NAME' already running"
  exit 0
}

if (& $DOCKER_CMD ps -q -a -f "name=$DB_CONTAINER_NAME") {
  & $DOCKER_CMD start $DB_CONTAINER_NAME | Out-Null
  Write-Host "Existing database container '$DB_CONTAINER_NAME' started"
  exit 0
}

# check if the port is already in use
$client = New-Object System.Net.Sockets.TcpClient
try {
  $connect = $client.BeginConnect("localhost", $DB_PORT, $null, $null)
  if ($connect.AsyncWaitHandle.WaitOne(500) -and $client.Connected) {
    Write-Host "Port $DB_PORT is already in use."
    exit 1
  }
} catch {
  # connection refused -> port is free
} finally {
  $client.Close()
}

if ($DB_PASSWORD -eq "password") {
  Write-Host "You are using the default database password"
  $reply = Read-Host "Should we generate a random password for you? [y/N]"
  if ($reply -notmatch '^[Yy]$') {
    Write-Host "Please change the default password in the .env file and try again"
    exit 1
  }
  # Generate a random URL-safe password
  $bytes = New-Object byte[] 12
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $DB_PASSWORD = [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_')

  $content = [System.IO.File]::ReadAllText($envFile)
  $content = $content.Replace(":password@", ":$DB_PASSWORD@")
  # write without BOM so other tools can still parse .env
  [System.IO.File]::WriteAllText($envFile, $content, (New-Object System.Text.UTF8Encoding $false))
}

& $DOCKER_CMD run -d `
  --name $DB_CONTAINER_NAME `
  -e POSTGRES_USER="postgres" `
  -e POSTGRES_PASSWORD="$DB_PASSWORD" `
  -e POSTGRES_DB="$DB_NAME" `
  -p "${DB_PORT}:5432" `
  docker.io/postgres

if ($LASTEXITCODE -eq 0) {
  Write-Host "Database container '$DB_CONTAINER_NAME' was successfully created"
} else {
  exit $LASTEXITCODE
}
