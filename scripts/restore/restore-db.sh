#!/bin/bash
# PostgreSQL 복원 스크립트
# 사용법: bash scripts/restore/restore-db.sh [백업파일경로]
# 예시: bash scripts/restore/restore-db.sh C:/Users/philk/Documents/invoice-backups/db/daily/invoice_db_daily_20260320.dump
set -euo pipefail

BACKUP_FILE="${1:-}"
CONTAINER_NAME="${DB_CONTAINER:-invoice_db}"
DB_NAME="${POSTGRES_DB:-invoice_db}"
DB_USER="${POSTGRES_USER:-invoice_user}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$1" "$2"
    fi
}

# ── 인자 확인 ────────────────────────────────────────────
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file_path>"
    echo ""
    echo "Available backups:"
    BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups/db}"
    find "$BACKUP_DIR" -name "*.dump" -type f -printf '  %T+ %p\n' 2>/dev/null | sort -r | head -20
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# ── 확인 프롬프트 ────────────────────────────────────────
echo "=========================================="
echo "  DATABASE RESTORE"
echo "=========================================="
echo "Backup file: $BACKUP_FILE"
echo "Target DB:   $DB_NAME"
echo "Container:   $CONTAINER_NAME"
echo ""
echo "WARNING: This will DROP and recreate the database!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# ── 컨테이너 확인 ────────────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "ERROR: Container $CONTAINER_NAME is not running"
    exit 1
fi

# ── 앱 서비스 중지 (DB 연결 해제) ─────────────────────────
log "Stopping application services..."
cd "$PROJECT_DIR"
docker compose stop backend celery_worker celery_beat flower 2>/dev/null || true

# ── 기존 연결 종료 ───────────────────────────────────────
log "Terminating existing connections..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# ── DB DROP & CREATE ─────────────────────────────────────
log "Dropping and recreating database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# ── pg_restore ───────────────────────────────────────────
log "Restoring from backup..."
if docker exec -i "$CONTAINER_NAME" pg_restore \
    --verbose \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-owner \
    --no-privileges \
    < "$BACKUP_FILE"; then
    log "Database restored successfully"
else
    log "WARNING: pg_restore completed with warnings (this is often normal)"
fi

# ── Alembic stamp ────────────────────────────────────────
log "Stamping Alembic migration head..."
docker compose run --rm backend alembic stamp head 2>/dev/null || \
    log "WARNING: Could not stamp Alembic (run manually if needed)"

# ── 앱 서비스 재시작 ──────────────────────────────────────
log "Restarting application services..."
docker compose start backend celery_worker celery_beat flower

# ── 완료 ─────────────────────────────────────────────────
log "=========================================="
log "  Database restore completed!"
log "=========================================="
send_alert "INFO" "Database restored from: $(basename "$BACKUP_FILE")"
