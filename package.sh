#!/bin/bash
# IPTV Boss — Clean Distribution Package Builder
# Usage: bash package.sh

set -e

NAME="iptv-boss"
VERSION="1.0.0"
OUTPUT="${NAME}-v${VERSION}.zip"

echo "🔨 Building distribution package: ${OUTPUT}"

# Ensure frontend is built
cd "$(dirname "$0")"
echo "📦 Building frontend..."
npm run build --prefix client 2>/dev/null || { echo "⚠️  Build failed, using existing dist/ if available"; }

# Remove stale SQLite locks
rm -f server/data.db-shm server/data.db-wal

# Create zip excluding dev/unnecessary files
echo "🗜️  Creating archive..."
zip -r "${OUTPUT}" \
  .env.example \
  package.json \
  package-lock.json \
  server/ \
  client/ \
  deploy.sh \
  DOCUMENTATION.md \
  -x "*/node_modules/*" \
  -x "*/.git/*" \
  -x "client/dist/*" \
  -x ".env" \
  -x "*.log" \
  -x "*.db-shm" \
  -x "*.db-wal" \
  -x ".vite/*"

echo "✅ Package created: ${OUTPUT}"
echo "📏 Size: $(du -h "${OUTPUT}" | cut -f1)"
echo ""
echo "⚠️  Note: The data.db file is NOT included."
echo "   First-time setup will auto-create default data."
echo "   To include your existing DB: add server/data.db to the zip command"
