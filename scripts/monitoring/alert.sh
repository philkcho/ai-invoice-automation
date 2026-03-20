#!/bin/bash
# 텔레그램 알림 발송 스크립트
# 사용법: bash scripts/monitoring/alert.sh <LEVEL> <MESSAGE>
# 예시: bash scripts/monitoring/alert.sh CRITICAL "DB connection failed"

LEVEL="${1:-INFO}"
MESSAGE="${2:-No message provided}"
HOSTNAME=$(hostname)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# .env.dev에서 텔레그램 설정 로드
if [ -f "$PROJECT_DIR/.env.dev" ]; then
    TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(grep -E '^TELEGRAM_BOT_TOKEN=' "$PROJECT_DIR/.env.dev" 2>/dev/null | cut -d'=' -f2-)}"
    TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-$(grep -E '^TELEGRAM_CHAT_ID=' "$PROJECT_DIR/.env.dev" 2>/dev/null | cut -d'=' -f2-)}"
fi

# 레벨별 이모지
case "$LEVEL" in
    CRITICAL) EMOJI="🔴" ;;
    WARNING)  EMOJI="🟡" ;;
    INFO)     EMOJI="🟢" ;;
    *)        EMOJI="⚪" ;;
esac

FORMATTED_MESSAGE="${EMOJI} *[${LEVEL}] Invoice System*
Host: \`${HOSTNAME}\`
Time: \`${TIMESTAMP}\`

${MESSAGE}"

# ── 텔레그램 전송 ────────────────────────────────────────
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -X POST \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${FORMATTED_MESSAGE}" \
        -d "parse_mode=Markdown" \
        --max-time 10 \
        > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo "[${TIMESTAMP}] Alert sent to Telegram: [${LEVEL}] ${MESSAGE}"
    else
        echo "[${TIMESTAMP}] WARNING: Failed to send Telegram alert"
    fi
else
    echo "[${TIMESTAMP}] [${LEVEL}] ${MESSAGE}"
    echo "  (Telegram not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)"
fi

# ── 로그 파일에도 기록 ───────────────────────────────────
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
echo "[${TIMESTAMP}] [${LEVEL}] ${MESSAGE}" >> "$LOG_DIR/alerts.log"
