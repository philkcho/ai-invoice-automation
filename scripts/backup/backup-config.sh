#!/bin/bash
# 환경 설정 암호화 백업 스크립트
# 사용법: bash scripts/backup/backup-config.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups/config}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR=$(mktemp -d)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$1" "$2"
    fi
}

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"

# ── 설정 파일 수집 ───────────────────────────────────────
log "Collecting config files..."

# .env 파일들
for envfile in "$PROJECT_DIR"/.env*; do
    if [ -f "$envfile" ]; then
        cp "$envfile" "$TEMP_DIR/"
    fi
done

# docker-compose 설정
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    cp "$PROJECT_DIR/docker-compose.yml" "$TEMP_DIR/"
fi

# Redis 설정
if [ -f "$PROJECT_DIR/docker/redis.conf" ]; then
    cp "$PROJECT_DIR/docker/redis.conf" "$TEMP_DIR/"
fi

# credentials 디렉토리
if [ -d "$PROJECT_DIR/backend/credentials" ]; then
    cp -r "$PROJECT_DIR/backend/credentials" "$TEMP_DIR/credentials"
fi

# ── 아카이브 생성 ────────────────────────────────────────
ARCHIVE_FILE="$BACKUP_DIR/config_${TIMESTAMP}.tar.gz"

log "Creating archive..."
tar czf "$ARCHIVE_FILE" -C "$TEMP_DIR" .

# ── AES-256 암호화 (openssl 사용 가능한 경우) ─────────────
CONFIG_BACKUP_PASSWORD="${CONFIG_BACKUP_PASSWORD:-}"

if [ -n "$CONFIG_BACKUP_PASSWORD" ] && command -v openssl &>/dev/null; then
    ENCRYPTED_FILE="${ARCHIVE_FILE}.enc"
    openssl enc -aes-256-cbc -salt -pbkdf2 -in "$ARCHIVE_FILE" -out "$ENCRYPTED_FILE" -pass "pass:$CONFIG_BACKUP_PASSWORD"
    rm -f "$ARCHIVE_FILE"
    log "Encrypted config backup created: $ENCRYPTED_FILE"
    send_alert "INFO" "Config backup completed (encrypted): $(du -h "$ENCRYPTED_FILE" | cut -f1)"
else
    log "Config backup created (unencrypted): $ARCHIVE_FILE"
    log "WARNING: Set CONFIG_BACKUP_PASSWORD to enable encryption"
    send_alert "INFO" "Config backup completed (unencrypted): $(du -h "$ARCHIVE_FILE" | cut -f1)"
fi
