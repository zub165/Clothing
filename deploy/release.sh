#!/usr/bin/env bash
# Production release on VPS (called by GitHub Actions or manually after git pull).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env on server."
  echo "  cp .env.production.example .env && nano .env"
  exit 1
fi

# shellcheck disable=SC1091
source .env
PORT="${PORT:-3100}"

echo "=== Clothify release ==="
echo "→ npm install (API)"
npm ci --omit=dev 2>/dev/null || npm ci

# React is hosted on GitHub Pages — skip client build on VPS unless opted in
if [ "${SKIP_CLIENT_BUILD:-true}" = "true" ]; then
  echo "→ Skip React build (SKIP_CLIENT_BUILD=true, frontend on GitHub Pages)"
else
  echo "→ Build React shop"
  cd client
  npm ci
  export VITE_API_URL="${VITE_API_URL:-}"
  npm run build
  cd ..
fi

echo "→ Database migrate"
chmod +x deploy/migrate-db.sh
./deploy/migrate-db.sh

echo "→ Restart API (PM2)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart clothify-api 2>/dev/null || pm2 start server.js --name clothify-api
  pm2 save
else
  echo "WARN: pm2 not installed. Start manually: node server.js"
fi

echo "→ Health check"
sleep 2
if curl -sf "http://127.0.0.1:${PORT}/api/status" >/dev/null; then
  echo "✓ API healthy on port ${PORT}"
  curl -s "http://127.0.0.1:${PORT}/api/status" | head -c 200
  echo ""
else
  echo "✗ Health check failed — check: pm2 logs clothify-api"
  exit 1
fi

echo "=== Release complete ==="
