#!/usr/bin/env bash
#
# Run the full local test suite in order: Unit → Integration → E2E
#
# Usage:
#   ./scripts/test-all.sh              # full run
#   ./scripts/test-all.sh --skip-build # E2E re-run without next build
#   ./scripts/test-all.sh --keep-db    # leave test Postgres container running
#
# Prerequisites:
#   - Node.js 20+, npm install
#   - Docker Desktop (for E2E only)
#   - .env.test (copy from .env.test.example) or the example file is used as fallback
#   - Playwright Chromium: npx playwright install chromium  (first time only)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SKIP_BUILD=false
KEEP_DB=false

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --keep-db) KEEP_DB=true ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

log() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$1"
}

fail() {
  printf '\n\033[1;31mERROR: %s\033[0m\n' "$1" >&2
  exit 1
}

load_test_env() {
  if [[ -f .env.test ]]; then
    log "Loading .env.test"
    set -a
    # shellcheck disable=SC1091
    source .env.test
    set +a
  elif [[ -f .env.test.example ]]; then
    log "No .env.test found — using .env.test.example"
    set -a
    # shellcheck disable=SC1091
    source .env.test.example
    set +a
  else
    fail "Missing .env.test and .env.test.example"
  fi

  export DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5433/healthacademy_test}"
  export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
  export E2E_TEST="${E2E_TEST:-true}"
  export ARCJET_ENV="${ARCJET_ENV:-development}"
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker is required for E2E tests. Install Docker Desktop and try again."
  docker info >/dev/null 2>&1 || fail "Docker daemon is not running. Start Docker Desktop and try again."
}

cleanup_db() {
  if [[ "$KEEP_DB" == false ]]; then
    log "Stopping test database"
    npm run test:db:down || true
  else
    log "Keeping test database running (--keep-db)"
  fi
}

on_exit() {
  local code=$?
  if [[ $code -ne 0 ]]; then
    printf '\n\033[1;31mTest run failed (exit %s)\033[0m\n' "$code" >&2
  fi
}
trap on_exit EXIT

# ── 1. Unit tests ─────────────────────────────────────────────────────────────

log "Unit tests"
npm run test:unit

# ── 2. Integration tests ──────────────────────────────────────────────────────

log "Integration tests"
npm run test:integration

# ── 3. E2E tests ──────────────────────────────────────────────────────────────

log "E2E prerequisites"
require_docker
load_test_env

log "Starting and seeding test database"
npm run test:db:setup

if [[ "$SKIP_BUILD" == false ]]; then
  log "Production build (required for next start)"
  npm run build
else
  log "Skipping build (--skip-build)"
  [[ -d .next ]] || fail ".next not found — run without --skip-build first"
fi

log "E2E tests (Playwright)"
export NODE_OPTIONS="${NODE_OPTIONS:---import tsx}"
export ARCJET_ENV="${ARCJET_ENV:-development}"
npm run test:e2e

cleanup_db

log "All tests passed (unit → integration → e2e)"
