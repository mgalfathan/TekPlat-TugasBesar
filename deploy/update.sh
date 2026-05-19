#!/usr/bin/env bash
# Pull latest, rebuild, restart Sportlytics on the VM.
# Usage: bash deploy/update.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/sportlytics/app}"

cd "$APP_DIR"

echo "→ Pulling latest from main..."
git pull --ff-only

echo "→ Installing dependencies..."
npm install

echo "→ Applying any pending Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push

echo "→ Building Next.js..."
npm run build

echo "→ Restarting PM2 process..."
pm2 restart sportlytics --update-env

echo "✅ Deploy complete: $(date)"
pm2 status sportlytics
