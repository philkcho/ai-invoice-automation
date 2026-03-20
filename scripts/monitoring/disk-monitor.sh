#!/bin/bash
# 디스크 모니터링 스크립트 (1시간마다 실행)
# 사용법: bash scripts/monitoring/disk-monitor.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WARNING_THRESHOLD="${WARNING_THRESHOLD:-85}"
CRITICAL_THRESHOLD="${CRITICAL_THRESHOLD:-95}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

send_alert() {
    bash "$SCRIPT_DIR/alert.sh" "$1" "$2"
}

log "=== Disk Monitor ==="

# 모든 마운트된 파티션 검사
df -h | tail -n +2 | while read -r line; do
    USAGE_PCT=$(echo "$line" | awk '{print $5}' | tr -d '%')
    MOUNT=$(echo "$line" | awk '{print $NF}')
    FREE=$(echo "$line" | awk '{print $4}')

    # 숫자가 아닌 경우 스킵
    if ! [[ "$USAGE_PCT" =~ ^[0-9]+$ ]]; then
        continue
    fi

    if [ "$USAGE_PCT" -ge "$CRITICAL_THRESHOLD" ]; then
        log "CRITICAL: $MOUNT at ${USAGE_PCT}% (free: $FREE)"
        send_alert "CRITICAL" "Disk CRITICAL: $MOUNT at ${USAGE_PCT}% usage (free: $FREE)"
    elif [ "$USAGE_PCT" -ge "$WARNING_THRESHOLD" ]; then
        log "WARNING: $MOUNT at ${USAGE_PCT}% (free: $FREE)"
        send_alert "WARNING" "Disk WARNING: $MOUNT at ${USAGE_PCT}% usage (free: $FREE)"
    else
        log "OK: $MOUNT at ${USAGE_PCT}% (free: $FREE)"
    fi
done

# Docker 시스템 디스크 사용량
log "--- Docker disk usage ---"
docker system df 2>/dev/null || log "Cannot check Docker disk usage"
