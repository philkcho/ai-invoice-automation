#!/bin/bash
set -e

echo "========================================="
echo "  AI Invoice Automation — Deploy Script"
echo "========================================="

cd ~/ai-invoice-automation

# 1. 마이그레이션용 DATABASE_URL 변경 (Session pooler, port 5432)
echo "[1/5] Switching DATABASE_URL to Session pooler for migration..."
sed -i 's|:6543/postgres?prepared_statement_cache_size=0|:5432/postgres|' .env.prod

# 2. Docker 이미지 빌드
echo "[2/5] Building Docker images (this takes 20~40 min on first run)..."
docker compose -f docker-compose.prod.yml build

# 3. Alembic 마이그레이션
echo "[3/5] Running Alembic migration..."
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

# 4. DATABASE_URL 복원 (Transaction pooler, port 6543)
echo "[4/5] Restoring DATABASE_URL to Transaction pooler..."
sed -i 's|:5432/postgres|:6543/postgres?prepared_statement_cache_size=0|' .env.prod

# 5. 서비스 시작
echo "[5/5] Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo "========================================="
echo "  Deploy complete!"
echo "  Check: docker compose -f docker-compose.prod.yml ps"
echo "  Health: curl http://localhost:8000/health"
echo "========================================="
