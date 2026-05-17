#!/usr/bin/env bash
# Apply schema + shop tables. Safe to re-run (idempotent where possible).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example (local) or .env.production.example (VPS)."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-clothing_user}"
DB_NAME="${DB_NAME:-clothing_business}"

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "ERROR: DB_PASSWORD is not set in .env"
  exit 1
fi

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD")

echo "→ Migrating database: $DB_NAME on $DB_HOST"

if [[ -f schema.sql ]]; then
  "${MYSQL[@]}" "$DB_NAME" < schema.sql
  echo "  ✓ schema.sql"
fi

if [[ -f schema-shop.sql ]]; then
  # ALTERs may fail if columns exist — continue
  "${MYSQL[@]}" "$DB_NAME" < schema-shop.sql 2>/dev/null || true
  echo "  ✓ schema-shop.sql"
fi

COUNT=$("${MYSQL[@]}" -N "$DB_NAME" -e "SELECT COUNT(*) FROM inventory" 2>/dev/null || echo "0")
if [[ "${COUNT:-0}" -eq 0 ]] && [[ -f seed-sample.sql ]]; then
  "${MYSQL[@]}" "$DB_NAME" < seed-sample.sql
  echo "  ✓ seed-sample.sql (empty inventory)"
else
  echo "  · seed skipped (inventory has $COUNT rows)"
fi

echo "→ Database migration complete."
