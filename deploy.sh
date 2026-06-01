#!/bin/bash
set -e

source .env 2>/dev/null || true

REGION="${1:-default}"

if [ "$REGION" != "default" ]; then
  REGION_VAR_PREFIX="REGION_$(echo "$REGION" | tr '[:lower:]' '[:upper:]')"
  VPS_HOST="${!REGION_VAR_PREFIX}_HOST"
  VPS_USER="${!REGION_VAR_PREFIX}_USER"
  VPS_PATH="${!REGION_VAR_PREFIX}_PATH"
  if [ -z "$VPS_HOST" ]; then
    echo "❌ Region '$REGION' not configured. Set ${REGION_VAR_PREFIX}_HOST in .env"
    exit 1
  fi
  VPS_USER="${VPS_USER:-root}"
  VPS_PATH="${VPS_PATH:-/var/www/iptv-boss}"
  echo "🚀 Deploying IPTV Boss to $REGION region ($VPS_HOST)..."
else
  if [ -z "$VPS_HOST" ] || [ "$VPS_HOST" = "your.server.ip" ]; then
    echo "❌ Set VPS_HOST, VPS_USER, and VPS_PATH in .env first"
    echo "   Or deploy to a region: bash deploy.sh us"
    exit 1
  fi
  echo "🚀 Deploying IPTV Boss to $VPS_HOST..."
fi

rsync -avz --delete \
  --exclude node_modules \
  --exclude .env \
  --exclude .git \
  --exclude '*.db' \
  ./ "$VPS_USER@$VPS_HOST:$VPS_PATH/"

ssh "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && npm install --production 2>/dev/null; \
  (pm2 delete iptv-boss 2>/dev/null || true); \
  pm2 start server/index.js --name iptv-boss; \
  pm2 save"

echo "✅ Deployed! Server running on $VPS_HOST:${PORT:-3001}"
