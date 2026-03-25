#!/bin/bash
# ─────────────────────────────────────────────────
#  GitHub Actions Secrets 자동 설정 스크립트
# ─────────────────────────────────────────────────
#  사용법: bash scripts/setup-secrets.sh
# ─────────────────────────────────────────────────

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
ask()  { echo -e "${CYAN}[?]${NC} $1"; }

REPO="philkcho/ai-invoice-automation"

echo ""
echo "========================================="
echo "  GitHub Actions Secrets 설정"
echo "  Repo: $REPO"
echo "========================================="
echo ""

# ── Step 1: gh CLI 확인/설치 ──
if ! command -v gh &> /dev/null; then
    warn "gh CLI가 설치되어 있지 않습니다. 설치합니다..."
    winget install GitHub.cli --accept-source-agreements --accept-package-agreements
    echo ""
    echo -e "${RED}[중요]${NC} gh CLI 설치 완료. 터미널을 닫고 다시 열어서 이 스크립트를 재실행하세요."
    exit 0
fi

log "gh CLI 확인됨: $(gh --version | head -1)"

# ── Step 2: gh 인증 확인 ──
if ! gh auth status &> /dev/null 2>&1; then
    warn "GitHub 인증이 필요합니다."
    echo "  브라우저가 열리면 GitHub에 로그인하세요."
    echo ""
    gh auth login -h github.com -p https -w
fi

log "GitHub 인증 확인됨"
echo ""

# ── Step 3: Secrets 입력 ──
echo "─── 서버 정보 ───"
echo ""

read -p "$(ask 'SERVER_HOST (서버 IP, 예: 132.145.210.152): ')" SERVER_HOST
read -p "$(ask 'SERVER_USER (SSH 유저명, 예: opc 또는 ubuntu): ')" SERVER_USER

echo ""
ask "SERVER_SSH_KEY (SSH 개인키 파일 경로)"
echo "  예: ~/.ssh/id_rsa 또는 ~/.ssh/oracle_key"
read -p "  경로: " SSH_KEY_PATH

# ~ 확장
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}[ERROR]${NC} 파일을 찾을 수 없습니다: $SSH_KEY_PATH"
    exit 1
fi

echo ""
echo "─── 프론트엔드 환경변수 ───"
echo ""

read -p "$(ask 'NEXT_PUBLIC_API_URL (예: https://yourdomain.com): ')" NEXT_PUBLIC_API_URL
read -p "$(ask 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (없으면 Enter): ')" STRIPE_KEY

echo ""
echo "─── GitHub Container Registry (서버 pull용) ───"
echo ""
echo "  GHCR_TOKEN은 GitHub PAT(Personal Access Token)입니다."
echo "  없으면 자동 생성합니다."
echo ""
read -p "$(ask '기존 PAT가 있으면 입력, 없으면 Enter: ')" GHCR_TOKEN

if [ -z "$GHCR_TOKEN" ]; then
    warn "GHCR_TOKEN 없음 — GitHub 토큰 생성 페이지를 엽니다."
    echo ""
    echo "  1. 'Generate new token (classic)' 클릭"
    echo "  2. Note: 'ghcr-deploy'"
    echo "  3. Scopes: 'read:packages' 체크"
    echo "  4. Generate 후 토큰 복사"
    echo ""
    if command -v start &> /dev/null; then
        start "https://github.com/settings/tokens/new?scopes=read:packages&description=ghcr-deploy"
    fi
    read -p "$(ask '생성된 토큰 붙여넣기: ')" GHCR_TOKEN
fi

# ── Step 4: Secrets 등록 ──
echo ""
echo "========================================="
echo "  Secrets 등록 중..."
echo "========================================="
echo ""

echo "$SERVER_HOST" | gh secret set SERVER_HOST -R "$REPO"
log "SERVER_HOST 설정 완료"

echo "$SERVER_USER" | gh secret set SERVER_USER -R "$REPO"
log "SERVER_USER 설정 완료"

gh secret set SERVER_SSH_KEY -R "$REPO" < "$SSH_KEY_PATH"
log "SERVER_SSH_KEY 설정 완료"

echo "$NEXT_PUBLIC_API_URL" | gh secret set NEXT_PUBLIC_API_URL -R "$REPO"
log "NEXT_PUBLIC_API_URL 설정 완료"

if [ -n "$STRIPE_KEY" ]; then
    echo "$STRIPE_KEY" | gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY -R "$REPO"
    log "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 설정 완료"
else
    warn "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 스킵 (빈 값)"
fi

echo "$GHCR_TOKEN" | gh secret set GHCR_TOKEN -R "$REPO"
log "GHCR_TOKEN 설정 완료"

# ── Step 5: 확인 ──
echo ""
echo "========================================="
echo "  등록된 Secrets 목록"
echo "========================================="
echo ""
gh secret list -R "$REPO"

echo ""
echo "========================================="
log "완료! main 브랜치에 push하면 자동 배포가 시작됩니다."
echo "========================================="
