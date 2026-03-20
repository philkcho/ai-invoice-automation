#!/bin/bash
# 백업 로테이션 스크립트
# 보관 정책: 일간 7개, 주간 4개, 월간 3개
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$1" "$2"
    fi
}

# 오래된 백업 삭제 (디렉토리, 패턴, 보관 개수)
rotate() {
    local dir="$1"
    local keep="$2"
    local label="$3"

    if [ ! -d "$dir" ]; then
        return
    fi

    local count
    count=$(find "$dir" -maxdepth 1 -type f | wc -l)

    if [ "$count" -gt "$keep" ]; then
        local to_delete=$((count - keep))
        log "Rotating $label: $count files found, keeping $keep, deleting $to_delete"
        find "$dir" -maxdepth 1 -type f -printf '%T+ %p\n' | sort | head -n "$to_delete" | cut -d' ' -f2- | while read -r file; do
            log "  Deleting: $(basename "$file")"
            rm -f "$file"
        done
    else
        log "$label: $count files (within limit of $keep)"
    fi
}

log "=== Backup rotation started ==="

# DB 백업 로테이션
rotate "$BACKUP_DIR/db/daily" 7 "DB daily"
rotate "$BACKUP_DIR/db/weekly" 4 "DB weekly"
rotate "$BACKUP_DIR/db/monthly" 3 "DB monthly"

# 미디어 백업 로테이션
rotate "$BACKUP_DIR/media" 7 "Media"

# 설정 백업 로테이션
rotate "$BACKUP_DIR/config" 5 "Config"

log "=== Backup rotation completed ==="
