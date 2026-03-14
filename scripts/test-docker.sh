#!/usr/bin/env bash
# Smoke-test: build dashboard image and verify pg is loadable at runtime.
# Usage: ./scripts/test-docker.sh
set -euo pipefail

PROJECT="axobotl-docker-test"
DASHBOARD_PORT=4050
CLEANUP() {
  echo "--- Cleaning up ---"
  docker compose -p "$PROJECT" -f docker-compose.test.yml down -v --remove-orphans 2>/dev/null || true
}
trap CLEANUP EXIT

# ---- 1. Build dashboard image from local Dockerfile ----
echo "=== Building dashboard image ==="
docker build --target dashboard -t "${PROJECT}-dashboard:local" .

# ---- 2. Start postgres + dashboard with a minimal compose file ----
cat > docker-compose.test.yml <<YAML
name: ${PROJECT}
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: axobotl_test
    expose: ["5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 10
  dashboard:
    image: ${PROJECT}-dashboard:local
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/axobotl_test
      PORT: "3000"
      NODE_ENV: production
      SESSION_SECRET: test-secret
      NEXTAUTH_URL: http://localhost:${DASHBOARD_PORT}
      NEXTAUTH_SECRET: test-secret
      DISCORD_CLIENT_ID: placeholder
      DISCORD_CLIENT_SECRET: placeholder
    ports: ["${DASHBOARD_PORT}:3000"]
    depends_on:
      postgres: { condition: service_healthy }
YAML

echo "=== Starting stack ==="
docker compose -p "$PROJECT" -f docker-compose.test.yml up -d

# ---- 3. Wait for dashboard to become healthy ----
echo "=== Waiting for dashboard ==="
TRIES=0
MAX_TRIES=30
until curl -sf "http://localhost:${DASHBOARD_PORT}/api/health" > /dev/null 2>&1; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "FAIL: dashboard did not become healthy after ${MAX_TRIES}s"
    echo "--- dashboard logs ---"
    docker compose -p "$PROJECT" -f docker-compose.test.yml logs dashboard
    exit 1
  fi
  sleep 1
done
echo "Dashboard healthy after ${TRIES}s"

# ---- 4. Hit endpoints and assert no 500s ----
PASS=0
FAIL=0

check() {
  local label="$1" url="$2" expected="$3"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "$expected" ]; then
    echo "  PASS  $label -> $status"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label -> $status (expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Testing endpoints ==="
check "GET /api/health"       "http://localhost:${DASHBOARD_PORT}/api/health"       200
check "GET /api/v1/stats"     "http://localhost:${DASHBOARD_PORT}/api/v1/stats"     401
check "GET /api/v1/guilds"    "http://localhost:${DASHBOARD_PORT}/api/v1/guilds"    401
check "GET /api/v1/commands"  "http://localhost:${DASHBOARD_PORT}/api/v1/commands"  401

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [ "$FAIL" -gt 0 ]; then
  echo "--- dashboard logs ---"
  docker compose -p "$PROJECT" -f docker-compose.test.yml logs dashboard
  exit 1
fi
