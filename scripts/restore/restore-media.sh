#!/bin/bash
# 미디어 파일 복원 스크립트
# 사용법: bash scripts/restore/restore-media.sh [백업파일경로]
set -euo pipefail

BACKUP_FILE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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
    echo "Available media backups:"
    BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups/media}"
    find "$BACKUP_DIR" -name "media_*.tar.gz" -type f -printf '  %T+ %p\n' 2>/dev/null | sort -r | head -10
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "=========================================="
echo "  MEDIA RESTORE"
echo "=========================================="
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "This will overwrite existing media files. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# ── 복원 ─────────────────────────────────────────────────
log "Restoring media files..."

if docker run --rm \
    -v invoice-system_media_files:/target \
    -v "$(dirname "$BACKUP_FILE")":/backup:ro \
    alpine:3.19 \
    sh -c "rm -rf /target/* && tar xzf /backup/$(basename "$BACKUP_FILE") -C /target"; then
    log "Media files restored successfully"
    send_alert "INFO" "Media restored from: $(basename "$BACKUP_FILE")"
else
    log "ERROR: Media restore failed"
    send_alert "CRITICAL" "Media restore failed from: $(basename "$BACKUP_FILE")"
    exit 1
fi
