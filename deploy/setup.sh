#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Ceylon Track — Post-Deploy Database Setup Script
# Run this on your EC2 instance AFTER the CloudFormation stack is CREATE_COMPLETE
#
# Usage:
#   bash /home/ubuntu/ceylon-track/deploy/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_DIR="/home/ubuntu/ceylon-track"
ENV_FILE="$REPO_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found at $ENV_FILE"
  echo "The CloudFormation UserData may still be running. Check:"
  echo "  tail -f /var/log/ceylon-userdata.log"
  exit 1
fi

# Load DATABASE_URL from .env
source <(grep -E '^DATABASE_URL=' "$ENV_FILE")

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not found in .env"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Ceylon Track — Database Setup"
echo "  DB: $DATABASE_URL"
echo "═══════════════════════════════════════════════════════"

cd "$REPO_DIR"

# ── Step 1: Enable PostGIS ──────────────────────────────────────────────────
echo ""
echo "[1/6] Enabling PostGIS extension..."
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;" \
  && echo "      ✓ PostGIS enabled" \
  || echo "      ⚠ PostGIS may already be enabled"

# ── Step 2: Core Schema ─────────────────────────────────────────────────────
echo ""
echo "[2/6] Applying core schema (database/schema.sql)..."
psql "$DATABASE_URL" -f database/schema.sql
echo "      ✓ Schema applied"

# ── Step 3: App-level migrations ────────────────────────────────────────────
echo ""
echo "[3/6] Applying app migrations (refresh tokens, reliability cache, MFA)..."
psql "$DATABASE_URL" -f database/app_tables_migration.sql
psql "$DATABASE_URL" -f database/mfa_migration.sql
echo "      ✓ App migrations applied"

# ── Step 4: Performance indexes ─────────────────────────────────────────────
echo ""
echo "[4/6] Applying performance indexes..."
psql "$DATABASE_URL" -f database/add_missing_indexes.sql
echo "      ✓ Indexes applied"

# ── Step 5: Seed data ───────────────────────────────────────────────────────
echo ""
echo "[5/6] Seeding database (stations, schedules, sample users)..."
psql "$DATABASE_URL" -f database/seed.sql
echo "      ✓ Seed data loaded"

# ── Step 6: Verify ──────────────────────────────────────────────────────────
echo ""
echo "[6/6] Verifying deployment..."
APP_PORT=$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2)
APP_PORT=${APP_PORT:-3000}

sleep 3  # give PM2 a moment if it just started

HEALTH=$(curl -s "http://localhost:$APP_PORT/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "      ✓ Health check PASSED: $HEALTH"
else
  echo "      ✗ Health check FAILED. Check PM2 logs:"
  echo "        pm2 logs ceylon-track --lines 50"
  exit 1
fi

# Get public IP for final output
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR_IP")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅  Ceylon Track is live!"
echo ""
echo "  URL:    http://$PUBLIC_IP"
echo "  Health: http://$PUBLIC_IP/health"
echo ""
echo "  Default credentials:"
echo "    passenger@ceylon.lk  /  Pass123!"
echo "    staff@ceylon.lk      /  Staff123!"
echo "    admin@ceylon.lk      /  Admin123!"
echo ""
echo "  Manage app:  pm2 status"
echo "  View logs:   pm2 logs ceylon-track"
echo "  Restart:     pm2 restart ceylon-track"
echo "═══════════════════════════════════════════════════════"
