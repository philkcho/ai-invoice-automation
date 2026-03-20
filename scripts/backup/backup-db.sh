#!/bin/bash
# PostgreSQL 자동 백업 스크립트
# 사용법: bash scripts/backup/backup-db.sh
set -euo pipefail

# ── 설정 ────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups/db}"
CONTAINER_NAME="${DB_CONTAINER:-invoice_db}"
DB_NAME="${POSTGRES_DB:-invoice_db}"
DB_USER="${POSTGRES_USER:-invoice_user}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── 함수 ────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    local level="$1"
    local message="$2"
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$level" "$message"
    fi
}

# ── 디렉토리 생성 ────────────────────────────────────────
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

# ── 컨테이너 확인 ────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container $CONTAINER_NAME is not running"
    send_alert "CRITICAL" "DB backup failed: container $CONTAINER_NAME not running"
    exit 1
fi

# ── 일간 백업 ────────────────────────────────────────────
DAILY_FILE="$BACKUP_DIR/daily/${DB_NAME}_daily_${TIMESTAMP}.dump"
log "Starting daily backup: $DAILY_FILE"

if docker exec "$CONTAINER_NAME" pg_dump \
    --format=custom \
    --verbose \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    > "$DAILY_FILE" 2>/dev/null; then
    log "Daily backup completed: $(du -h "$DAILY_FILE" | cut -f1)"
else
    log "ERROR: pg_dump failed"
    send_alert "CRITICAL" "DB backup failed: pg_dump error"
    rm -f "$DAILY_FILE"
    exit 1
fi

# ── 백업 유효성 검증 ─────────────────────────────────────
if docker exec -i "$CONTAINER_NAME" pg_restore --list < "$DAILY_FILE" > /dev/null 2>&1; then
    log "Backup verification passed"
else
    log "WARNING: Backup verification failed"
    send_alert "WARNING" "DB backup created but verification failed: $DAILY_FILE"
fi

# ── 주간 백업 (일요일) ───────────────────────────────────
if [ "$DAY_OF_WEEK" = "7" ]; then
    WEEKLY_FILE="$BACKUP_DIR/weekly/${DB_NAME}_weekly_${TIMESTAMP}.dump"
    cp "$DAILY_FILE" "$WEEKLY_FILE"
    log "Weekly backup created: $WEEKLY_FILE"
fi

# ── 월간 백업 (1일) ──────────────────────────────────────
if [ "$DAY_OF_MONTH" = "01" ]; then
    MONTHLY_FILE="$BACKUP_DIR/monthly/${DB_NAME}_monthly_${TIMESTAMP}.dump"
    cp "$DAILY_FILE" "$MONTHLY_FILE"
    log "Monthly backup created: $MONTHLY_FILE"
fi

log "DB backup completed successfully"
send_alert "INFO" "DB backup completed: $(du -h "$DAILY_FILE" | cut -f1)"
