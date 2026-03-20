#!/bin/bash
# 전체 백업 통합 스크립트
# 사용법: bash scripts/backup/backup-all.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-C:/Users/philk/Documents/invoice-backups}"
MIN_DISK_GB="${MIN_DISK_GB:-5}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    if [ -f "$SCRIPT_DIR/../monitoring/alert.sh" ]; then
        bash "$SCRIPT_DIR/../monitoring/alert.sh" "$1" "$2"
    fi
}

log "=========================================="
log "  Full Backup Started"
log "=========================================="

# ── 1. 디스크 공간 확인 ──────────────────────────────────
BACKUP_DRIVE=$(echo "$BACKUP_DIR" | cut -c1-2)
FREE_GB=$(df -BG "$BACKUP_DRIVE/" 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')

if [ -n "$FREE_GB" ] && [ "$FREE_GB" -lt "$MIN_DISK_GB" ]; then
    log "ERROR: Insufficient disk space (${FREE_GB}GB free, need ${MIN_DISK_GB}GB)"
    send_alert "CRITICAL" "Backup aborted: insufficient disk space (${FREE_GB}GB free)"
    exit 1
fi
log "Disk space check passed: ${FREE_GB}GB free"

# ── 2. DB 백업 ───────────────────────────────────────────
log "--- DB Backup ---"
if bash "$SCRIPT_DIR/backup-db.sh"; then
    log "DB backup: SUCCESS"
else
    log "DB backup: FAILED"
    send_alert "CRITICAL" "Full backup: DB backup failed"
fi

# ── 3. 미디어 백업 ───────────────────────────────────────
log "--- Media Backup ---"
if bash "$SCRIPT_DIR/backup-media.sh"; then
    log "Media backup: SUCCESS"
else
    log "Media backup: FAILED"
    send_alert "WARNING" "Full backup: Media backup failed"
fi

# ── 4. 설정 백업 ─────────────────────────────────────────
log "--- Config Backup ---"
if bash "$SCRIPT_DIR/backup-config.sh"; then
    log "Config backup: SUCCESS"
else
    log "Config backup: FAILED"
    send_alert "WARNING" "Full backup: Config backup failed"
fi

# ── 5. 백업 로테이션 ─────────────────────────────────────
log "--- Backup Rotation ---"
if bash "$SCRIPT_DIR/rotate-backups.sh"; then
    log "Rotation: SUCCESS"
else
    log "Rotation: FAILED"
fi

# ── 6. 완료 리포트 ───────────────────────────────────────
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
log "=========================================="
log "  Full Backup Completed"
log "  Total backup size: $TOTAL_SIZE"
log "=========================================="
send_alert "INFO" "Full backup completed. Total size: $TOTAL_SIZE"
