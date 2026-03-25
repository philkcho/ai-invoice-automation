#!/bin/bash
set -e

# ─────────────────────────────────────────────────
#  AI Invoice Automation — Production Deploy Script
# ─────────────────────────────────────────────────
#  Usage:
#    ./scripts/deploy.sh              # 최신 이미지 pull + 재시작
#    ./scripts/deploy.sh --migrate    # 이미지 pull + DB 마이그레이션
#    ./scripts/deploy.sh --quick      # pull 없이 재시작만
# ─────────────────────────────────────────────────

COMPOSE="docker compose -f docker-compose.prod.yml"
PROJECT_DIR=~/ai-invoice-automation
HEALTH_URL="http://localhost:8000/health"
MAX_HEALTH_WAIT=300  # seconds

BACKEND_IMAGE="ghcr.io/philkcho/ai-invoice-automation/backend:latest"
FRONTEND_IMAGE="ghcr.io/philkcho/ai-invoice-automation/frontend:latest"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Parse args ──
DO_MIGRATE=false
QUICK_MODE=false
for arg in "$@"; do
    case $arg in
        --migrate) DO_MIGRATE=true ;;
        --quick)   QUICK_MODE=true ;;
    esac
done

cd "$PROJECT_DIR"

# Load NEXT_PUBLIC_* vars from .env.prod for Docker build args
if [ -f .env.prod ]; then
    export NEXT_PUBLIC_API_URL=$(grep '^NEXT_PUBLIC_API_URL=' .env.prod | cut -d'=' -f2-)
    export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(grep '^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=' .env.prod | cut -d'=' -f2-)
fi

echo ""
echo "========================================="
echo "  AI Invoice Automation — Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "========================================="
echo ""

# ── Step 1: Git Pull ──
log "[1/5] Pulling latest code..."
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
    warn "No new commits. Current: ${AFTER:0:7}"
else
    log "Updated: ${BEFORE:0:7} → ${AFTER:0:7}"
    echo ""
    git log --oneline "${BEFORE}..${AFTER}"
    echo ""
fi

# ── Step 2: Quick mode (restart only) ──
if [ "$QUICK_MODE" = true ]; then
    log "[QUICK] Restarting containers (no pull)..."
    $COMPOSE restart backend celery_worker celery_beat frontend
    log "Done! Skipping health check in quick mode."
    exit 0
fi

# ── Step 3: Pull images ──
log "[2/5] Pulling latest images..."
PULL_START=$(date +%s)
docker pull "$BACKEND_IMAGE"
docker pull "$FRONTEND_IMAGE"
PULL_END=$(date +%s)
log "Pull completed in $((PULL_END - PULL_START))s"

# ── Step 4: Migration (optional) ──
if [ "$DO_MIGRATE" = true ]; then
    log "[3/5] Running DB migration..."

    # Swap to Session pooler (port 5432) for Alembic
    log "  Switching to Session pooler (port 5432)..."
    sed -i 's|:6543/postgres?prepared_statement_cache_size=0|:5432/postgres|' .env.prod

    # Run migration
    $COMPOSE run --rm backend alembic upgrade head
    MIGRATE_EXIT=$?

    # Restore Transaction pooler (port 6543)
    log "  Restoring Transaction pooler (port 6543)..."
    sed -i 's|:5432/postgres|:6543/postgres?prepared_statement_cache_size=0|' .env.prod

    if [ $MIGRATE_EXIT -ne 0 ]; then
        err "Migration failed! Check alembic output above."
        exit 1
    fi
    log "  Migration completed successfully."
else
    log "[3/5] Migration skipped (use --migrate to run)"
fi

# ── Step 5: Start services ──
log "[4/5] Starting services..."
$COMPOSE up -d

# ── Step 6: Health check ──
log "[5/5] Waiting for health check..."
WAITED=0
while [ $WAITED -lt $MAX_HEALTH_WAIT ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        log "  Health check passed! (${WAITED}s)"
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    echo -n "."
done
echo ""

if [ $WAITED -ge $MAX_HEALTH_WAIT ]; then
    err "Health check failed after ${MAX_HEALTH_WAIT}s"
    err "Check logs: $COMPOSE logs backend --tail 50"
    exit 1
fi

# ── Status report ──
echo ""
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}"
echo ""
echo "========================================="
log "Deploy complete! ✓"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  Health: $HEALTH_URL → OK"
echo "========================================="
