#!/bin/bash
# 외부 헬스체크 스크립트 (5분마다 실행)
# 사용법: bash scripts/monitoring/health-check.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/health}"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/health-check.log"; }

send_alert() {
    bash "$SCRIPT_DIR/alert.sh" "$1" "$2"
}

ERRORS=()

# ── 1. API 헬스체크 ──────────────────────────────────────
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log "API health: OK (HTTP $HTTP_CODE)"
else
    log "API health: FAILED (HTTP $HTTP_CODE)"
    ERRORS+=("API health check failed (HTTP $HTTP_CODE)")
fi

# ── 2. Docker 컨테이너 상태 확인 ──────────────────────────
REQUIRED_CONTAINERS=("invoice_db" "invoice_redis" "invoice_backend" "invoice_celery_worker" "invoice_celery_beat" "invoice_frontend")

for container in "${REQUIRED_CONTAINERS[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
    HEALTH=$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

    if [ "$STATUS" != "running" ]; then
        log "Container $container: NOT RUNNING ($STATUS)"
        ERRORS+=("Container $container is $STATUS")
    elif [ "$HEALTH" = "unhealthy" ]; then
        log "Container $container: UNHEALTHY"
        ERRORS+=("Container $container is unhealthy")
    else
        log "Container $container: OK"
    fi
done

# ── 3. 결과 보고 ─────────────────────────────────────────
if [ ${#ERRORS[@]} -eq 0 ]; then
    log "Health check passed: all services OK"
else
    ERROR_MSG="Health check FAILED (${#ERRORS[@]} issues):"
    for err in "${ERRORS[@]}"; do
        ERROR_MSG="$ERROR_MSG\n- $err"
    done
    log "$ERROR_MSG"
    send_alert "CRITICAL" "$ERROR_MSG"
fi
