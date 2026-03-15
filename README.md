# AI Invoice Automation System

AI 기반 멀티컴퍼니 인보이스 자동 처리, 검증, 승인, 결제 추적 시스템

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11 + FastAPI |
| Frontend | Next.js 14 + Tailwind CSS |
| Database | PostgreSQL 15 |
| OCR / AI | Claude API (Anthropic) |
| Task Queue | Celery + Redis |
| File Storage | AWS S3 |
| Email | Gmail API + Microsoft Graph API |
| Monitoring | Sentry |

---

## 처음 시작하기

### 1. 환경 변수 설정

```bash
cp .env.dev .env.dev.local
# .env.dev.local 파일을 열고 실제 값으로 수정
```

필수 입력 항목:
- `SECRET_KEY` — 32자 이상 랜덤 문자열
- `ANTHROPIC_API_KEY` — Claude API 키
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — S3용
- `ENCRYPTION_KEY` — AES-256용 32바이트 Base64 키

### 2. Docker로 실행

```bash
# 전체 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# DB 마이그레이션 실행
docker-compose exec backend alembic upgrade head
```

### 3. 접속

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API 문서 (Swagger) | http://localhost:8000/docs |
| Celery 모니터링 | http://localhost:5555 |

---

## 개발 명령어

```bash
# 마이그레이션 파일 생성
docker-compose exec backend alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
docker-compose exec backend alembic upgrade head

# 마이그레이션 롤백
docker-compose exec backend alembic downgrade -1

# 백엔드 셸 접속
docker-compose exec backend bash

# DB 접속
docker-compose exec db psql -U invoice_user -d invoice_db
```

---

## 프로젝트 구조

```
ai-invoice-automation/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI 라우터
│   │   ├── core/               # 설정, DB, 인증, 미들웨어
│   │   ├── models/             # SQLAlchemy 모델 (22개 테이블)
│   │   ├── schemas/            # Pydantic 스키마
│   │   ├── services/           # 비즈니스 로직
│   │   ├── tasks/              # Celery 작업
│   │   └── utils/              # 공통 유틸리티
│   ├── alembic/                # DB 마이그레이션
│   └── requirements.txt
├── frontend/
│   ├── app/                    # Next.js App Router
│   ├── components/             # 공통 컴포넌트
│   └── lib/                    # API 클라이언트, 유틸
├── docker-compose.yml
├── .env.dev                    # 개발 환경 변수 템플릿
└── README.md
```

---

## 개발 Phase

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Docker + 프로젝트 구조 셋업 | ✅ 완료 |
| 2 | 회사·사용자 관리 | 🔜 |
| 3 | Vendor 마스터 | 🔜 |
| 4 | 세금·PO 관리 | 🔜 |
| 5 | 검증 엔진 | 🔜 |
| 6 | 인보이스 처리 + OCR | 🔜 |
| 7 | 승인·결제 워크플로우 | 🔜 |
| 8 | 이메일 연동 | 🔜 |
| 9 | 대시보드·보고서 | 🔜 |
| 10 | 마무리·배포 | 🔜 |
