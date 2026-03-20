#!/bin/bash
# 전체 시스템 복구 스크립트
# 사용법: bash scripts/restore/restore-all.sh [db_backup_file] [media_backup_file]
set -euo pipefail

DB_BACKUP="${1:-}"
MEDIA_BACKUP="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$1" "$2"
    fi
}

echo "=========================================="
echo "  FULL SYSTEM RESTORE"
echo "=========================================="

# ── 1. Docker 확인 ───────────────────────────────────────
log "Checking Docker..."
if ! command -v docker &>/dev/null; then
    log "ERROR: Docker is not installed"
    exit 1
fi

if ! docker info &>/dev/null; then
    log "ERROR: Docker daemon is not running"
    exit 1
fi
log "Docker: OK"

# ── 2. 환경 설정 확인 ────────────────────────────────────
log "Checking environment..."
cd "$PROJECT_DIR"

if [ ! -f ".env.dev" ]; then
    log "WARNING: .env.dev not found"
    # 암호화된 설정 백업에서 복원 시도
    LATEST_CONFIG=$(find "$BACKUP_DIR/config" -name "config_*" -type f 2>/dev/null | sort -r | head -1)
    if [ -n "$LATEST_CONFIG" ]; then
        log "Found config backup: $LATEST_CONFIG"
        if [[ "$LATEST_CONFIG" == *.enc ]]; then
            log "Config backup is encrypted. Decrypt manually first:"
            log "  openssl enc -aes-256-cbc -d -pbkdf2 -in $LATEST_CONFIG -out config_restore.tar.gz"
            exit 1
        else
            tar xzf "$LATEST_CONFIG" -C "$PROJECT_DIR/"
            log "Config restored from backup"
        fi
    else
        log "ERROR: No .env.dev and no config backup found"
        exit 1
    fi
fi
log "Environment: OK"

# ── 3. 최신 백업 자동 검색 ────────────────────────────────
if [ -z "$DB_BACKUP" ]; then
    DB_BACKUP=$(find "$BACKUP_DIR/db" -name "*.dump" -type f 2>/dev/null | sort -r | head -1)
    if [ -z "$DB_BACKUP" ]; then
        log "ERROR: No DB backup found in $BACKUP_DIR/db"
        exit 1
    fi
    log "Auto-selected DB backup: $DB_BACKUP"
fi

if [ -z "$MEDIA_BACKUP" ]; then
    MEDIA_BACKUP=$(find "$BACKUP_DIR/media" -name "media_*.tar.gz" -type f 2>/dev/null | sort -r | head -1)
    if [ -n "$MEDIA_BACKUP" ]; then
        log "Auto-selected media backup: $MEDIA_BACKUP"
    else
        log "WARNING: No media backup found (skipping media restore)"
    fi
fi

echo ""
echo "Restore plan:"
echo "  DB backup:    ${DB_BACKUP:-NONE}"
echo "  Media backup: ${MEDIA_BACKUP:-SKIP}"
echo ""
read -p "Proceed with full restore? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# ── 4. Docker 이미지 빌드 ────────────────────────────────
log "Building Docker images..."
docker compose build

# ── 5. DB + Redis 시작 ───────────────────────────────────
log "Starting database and Redis..."
docker compose up -d db redis

# DB 준비 대기
log "Waiting for database to be ready..."
for i in $(seq 1 30); do
    if docker exec invoice_db pg_isready -U "${POSTGRES_USER:-invoice_user}" &>/dev/null; then
        log "Database is ready"
        break
    fi
    if [ "$i" -eq 30 ]; then
        log "ERROR: Database did not become ready in time"
        exit 1
    fi
    sleep 2
done

# ── 6. DB 복원 ───────────────────────────────────────────
log "Restoring database..."
# restore-db.sh의 확인 프롬프트를 자동 통과시키기 위해 직접 수행
docker exec invoice_db psql -U "${POSTGRES_USER:-invoice_user}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-invoice_db}' AND pid <> pg_backend_pid();" 2>/dev/null || true
docker exec invoice_db psql -U "${POSTGRES_USER:-invoice_user}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-invoice_db};"
docker exec invoice_db psql -U "${POSTGRES_USER:-invoice_user}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB:-invoice_db} OWNER ${POSTGRES_USER:-invoice_user};"

if docker exec -i invoice_db pg_restore \
    --username="${POSTGRES_USER:-invoice_user}" \
    --dbname="${POSTGRES_DB:-invoice_db}" \
    --no-owner --no-privileges \
    < "$DB_BACKUP"; then
    log "Database restored"
else
    log "Database restored (with warnings)"
fi

# ── 7. 미디어 복원 ───────────────────────────────────────
if [ -n "$MEDIA_BACKUP" ]; then
    log "Restoring media files..."
    docker run --rm \
        -v invoice-system_media_files:/target \
        -v "$(dirname "$MEDIA_BACKUP")":/backup:ro \
        alpine:3.19 \
        sh -c "tar xzf /backup/$(basename "$MEDIA_BACKUP") -C /target" || \
        log "WARNING: Media restore had issues"
fi

# ── 8. 전체 서비스 시작 ──────────────────────────────────
log "Starting all services..."
docker compose up -d

# ── 9. 헬스체크 대기 ─────────────────────────────────────
log "Waiting for services to become healthy..."
sleep 15

# API 헬스체크
for i in $(seq 1 12); do
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:8000/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "API health check: OK"
        break
    fi
    if [ "$i" -eq 12 ]; then
        log "WARNING: API health check failed after 60 seconds"
    fi
    sleep 5
done

# ── 10. 완료 ─────────────────────────────────────────────
log "=========================================="
log "  Full System Restore Completed!"
log "=========================================="
log "  Frontend: http://localhost:3000"
log "  Backend:  http://localhost:8000"
log "  API Docs: http://localhost:8000/docs"
log "=========================================="
send_alert "INFO" "Full system restore completed successfully"
