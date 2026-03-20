#!/bin/bash
# 미디어 파일 백업 스크립트 (Docker volume -> tar.gz)
# 사용법: bash scripts/backup/backup-media.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups/media}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$1" "$2"
    fi
}

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/media_${TIMESTAMP}.tar.gz"

# Docker volume에서 직접 백업
log "Starting media backup..."

if docker run --rm \
    -v invoice-system_media_files:/source:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.19 \
    tar czf "/backup/media_${TIMESTAMP}.tar.gz" -C /source . 2>/dev/null; then
    log "Media backup completed: $(du -h "$BACKUP_FILE" | cut -f1)"
    send_alert "INFO" "Media backup completed: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    log "ERROR: Media backup failed"
    send_alert "CRITICAL" "Media backup failed"
    rm -f "$BACKUP_FILE"
    exit 1
fi
