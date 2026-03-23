# AI Invoice Automation System (AI 인보이스 자동화 시스템)

## 프로젝트 개요
다중 회사(멀티테넌트) AI 기반 인보이스 자동 처리/검증/승인/결제 추적 시스템.
PDF나 이미지로 수신된 인보이스를 OCR(Google Document AI) + AI(Claude API)로 자동 인식하고,
검증 엔진을 통해 유효성을 확인한 뒤, 승인 워크플로우를 거쳐 결제까지 추적한다.

## 기술 스택
- **백엔드**: Python 3.11 + FastAPI 0.111.0 — 비동기(async/await) 기반 REST API 서버
- **ORM/마이그레이션**: SQLAlchemy (asyncpg 드라이버) + Alembic — 비동기 DB 접근 및 스키마 버전 관리
- **프론트엔드**: Next.js 14 (App Router) + TypeScript + Tailwind CSS — React 기반 SPA
- **상태 관리**: Zustand (클라이언트 상태) + TanStack React Query (서버 상태/캐싱)
- **폼/검증**: React Hook Form + Zod — 프론트엔드 폼 처리 및 입력값 검증
- **데이터베이스**: PostgreSQL 15 — 메인 데이터 저장소 (28개 테이블)
- **메시지 큐**: Redis 7 + Celery 5.4.0 — 비동기 작업 처리 (OCR, 이메일 폴링, 알림 등)
- **작업 모니터링**: Flower — Celery 작업 상태 웹 UI
- **OCR**: Google Document AI (google-cloud-documentai 2.29.0) — 인보이스 이미지/PDF 텍스트 추출 (메인)
- **AI**: Claude API (Anthropic SDK 0.26.0) — OCR fallback + AI 채팅 (자연어 질의)
- **파일 저장소**: 로컬 파일시스템 (Docker volume) — 인보이스 원본 파일 저장 (S3 Optional)
- **인증**: JWT (access + refresh token) + bcrypt — 토큰 기반 인증 및 비밀번호 해싱
- **이메일**: Gmail API + Microsoft Graph API — 인보이스 이메일 자동 수집
- **결제**: Stripe (stripe 9.12.0) — 구독 결제 처리 및 웹훅
- **i18n**: React Context 기반 다국어 (영어/한국어)
- **모니터링**: Sentry — 에러 추적 및 알림
- **CI/CD**: GitHub Actions — pytest + jest + Docker 빌드 검증
- **컨테이너**: Docker Compose — 8개 서비스 오케스트레이션

## 개발 명령어
```bash
# 전체 서비스 시작 (백그라운드)
docker-compose up -d

# 서비스 로그 확인
docker-compose logs -f backend    # 백엔드 로그
docker-compose logs -f frontend   # 프론트엔드 로그
docker-compose logs -f celery_worker  # 셀러리 워커 로그

# 데이터베이스 마이그레이션
docker-compose exec backend alembic revision --autogenerate -m "설명"  # 마이그레이션 파일 생성
docker-compose exec backend alembic upgrade head     # 최신 마이그레이션 적용
docker-compose exec backend alembic downgrade -1     # 마이그레이션 1단계 롤백

# DB 직접 접속
docker-compose exec db psql -U invoice_user -d invoice_db

# 프론트엔드 (컨테이너 외부에서 직접 실행 시)
cd frontend && npm run dev    # 개발 서버 실행
cd frontend && npm run build  # 프로덕션 빌드
cd frontend && npm run lint   # ESLint 코드 검사
```

## 서비스 접속 정보
| 서비스 | URL | 설명 |
|--------|-----|------|
| 프론트엔드 | http://localhost:3000 | Next.js 웹 UI |
| 백엔드 API | http://localhost:8000 | FastAPI REST API |
| Swagger 문서 | http://localhost:8000/docs | API 자동 생성 문서 (테스트 가능) |
| ReDoc 문서 | http://localhost:8000/redoc | API 문서 (읽기 전용) |
| Flower | http://localhost:5555 | Celery 작업 모니터링 대시보드 |
| PostgreSQL | localhost:5432 | DB 직접 접속 (user: invoice_user) |
| Redis | localhost:6379 | 캐시 및 메시지 브로커 |

## 프로젝트 구조
```
backend/
  app/
    api/v1/endpoints/   # API 라우트 핸들러 (엔드포인트 정의)
    core/
      config.py         # 환경변수 기반 설정 (Pydantic Settings)
      database.py       # DB 엔진 및 세션 팩토리 (비동기)
      security.py       # JWT 토큰 생성/검증, 비밀번호 해싱
      context.py        # 다중 회사 컨텍스트 변수 관리
    middleware/          # 미들웨어 (company_context, rate_limiter, audit 등)
    models/             # SQLAlchemy ORM 모델 (DB 테이블 정의)
    schemas/            # Pydantic 스키마 (요청/응답 검증)
    services/           # 비즈니스 로직 계층
    tasks/              # Celery 비동기 작업 (OCR, 이메일, 알림 등)
      celery_app.py     # Celery 설정 및 스케줄 정의
    utils/              # 공통 유틸리티 함수
    main.py             # FastAPI 앱 초기화 및 미들웨어 설정
  tests/                # 테스트 (pytest)
    test_api/           # API 엔드포인트 테스트
    test_services/      # 서비스 계층 테스트
  alembic/              # DB 마이그레이션 파일
  requirements.txt      # Python 패키지 의존성
  Dockerfile            # 백엔드 컨테이너 이미지 정의

frontend/
  app/                  # Next.js App Router 페이지 및 레이아웃
  components/           # 공통 UI 컴포넌트
    common/             # Button, Modal, Table, StatusBadge, I18nProvider 등
    layout/             # Header, Sidebar, Footer
  hooks/                # 커스텀 훅 (useAuth, useApi 등)
  lib/                  # API 클라이언트, 유틸리티
    i18n/               # 다국어 번역 파일 (en.json, ko.json)
  stores/               # Zustand 상태 관리 (auth, toast, help 등)
  types/                # TypeScript 타입 정의
  __tests__/            # Jest 테스트 (로그인, 회원가입)
  public/               # 정적 파일 (favicon, 이미지 등)
  package.json          # Node.js 패키지 의존성
  tailwind.config.ts    # Tailwind CSS 테마 설정
  tsconfig.json         # TypeScript 컴파일러 설정
  Dockerfile            # 프론트엔드 컨테이너 이미지 정의

docker/                   # Docker 설정 (Caddyfile, redis.conf)
docs/                     # 운영 문서 (재해복구, 배포 가이드)
scripts/                  # 유틸리티 스크립트 (백업, 모니터링, 복원)
.github/workflows/        # GitHub Actions CI 파이프라인
설계서/                    # 시스템 설계 문서 (v12 최신, Overview)
```

## 코드 컨벤션
- **백엔드**: Python async/await 패턴 사용, 모든 API 입출력은 Pydantic 스키마로 검증
- **프론트엔드**: TypeScript 사용, Tailwind CSS로 스타일링, 컴포넌트는 함수형으로 작성
- **API 설계**: RESTful 원칙, 버전 관리 (`/api/v1/`), Swagger 자동 문서화
- **DB 모델**: 모든 테이블에 `created_at`, `updated_at` 타임스탬프 포함
- **마이그레이션**: Alembic autogenerate로 생성, 수동 검토 후 적용
- **언어**: 커밋 메시지, 주석, 문서는 한국어 사용 가능
- **UI 언어**: 모든 사용자 대면 텍스트(에러 메시지, 버튼, 라벨, 이메일 본문 등)는 **영어**로 작성

## 보안 규칙
- `.env` 파일은 절대 Git에 커밋하지 않음 (`.env.dev`는 개발용 템플릿, 실제 키 포함 금지)
- 인증: JWT access token (60분 만료) + refresh token (7일 만료) 이중 토큰 방식
- 비밀번호: bcrypt로 해싱하여 저장, 평문 저장 절대 금지
- **RBAC 역할 체계**:
  - `SUPER_ADMIN` — 전체 시스템 관리 (모든 회사 접근 가능)
  - `COMPANY_ADMIN` — 소속 회사 내 관리자 권한
  - `ACCOUNTANT` — 인보이스 처리 및 회계 업무
  - `APPROVER` — 인보이스 승인 권한
  - `VIEWER` — 읽기 전용 조회
- 다중 회사 데이터 격리: context variable로 회사 간 데이터 분리 보장

## Celery 예약 작업
- **이메일 폴링** — 5분마다 (Gmail + Outlook 인보이스 수신 확인)
- **환율 업데이트** — 매일 자정 UTC (외화 인보이스 환산용)
- **계약 만료 확인** — 매일 오전 8시 UTC
- **면세 만료 확인** — 매일 오전 8시 UTC
- **결제 기한 알림** — 매일 오전 8시 UTC
- **DB 백업** — 매일 03:00 KST (pg_dump, 로컬 DB 전용)
- **미디어 백업** — 매일 03:30 KST
- **백업 로테이션** — 매일 04:00 KST
- **헬스체크** — 5분마다
- **디스크 모니터링** — 매시 정각
- **설정 백업** — 매주 일요일 04:00 KST
- **이메일 다이제스트 (Daily)** — 매시 :05 (회사별 설정 시간 매칭)
- **이메일 다이제스트 (Weekly)** — 매시 :05 (회사별 설정 요일+시간 매칭)

## 개발 단계 (로드맵)
- **Phase 1**: Docker 환경 + 프로젝트 구조 셋업 ✅ 완료
- **Phase 2**: 회사 & 사용자 관리 (CRUD, 인증, 권한) ✅ 완료
- **Phase 3**: 거래처(Vendor) 마스터 데이터 관리 ✅ 완료
- **Phase 4**: 세금 & 구매주문서(PO) 관리 ✅ 완료
- **Phase 5**: 인보이스 검증 엔진 (규칙 기반 유효성 검사) ✅ 완료
- **Phase 6**: 인보이스 처리 + OCR (Google Document AI + Claude API fallback) ✅ 완료
- **Phase 7**: 승인 워크플로우 & 결제 추적 ✅ 완료
- **Phase 8**: 이메일 연동 (자동 인보이스 수집) ✅ 완료
- **Phase 9**: 대시보드 & 리포트 (차트, 통계, Excel/PDF 내보내기) ✅ 완료
- **Phase 10**: 최종화 & 프로덕션 배포 🔄 진행 중

## 참고 사항
- 설계 문서는 `설계서/` 폴더에 위치 (v12가 최신)
- 구현된 엔드포인트: auth, companies, users, vendors, tax-rates, purchase-orders, invoice-types, invoices, exchange-rates, global-rules, type-rules, vendor-contracts, notifications, approval-settings, approvals, payments, email-configurations, dashboard, reports, billing, chat, company-policies, company-type-settings, linkage-details, recurring-amounts, contact, email-digest
- 테스트: pytest (백엔드 70+개) + Jest (프론트엔드 16개) 구현 완료
- Docker 서비스 간 의존성과 헬스체크가 docker-compose.yml에 정의되어 있음
- **공개 페이지** (인증 불필요): Landing, FAQ, Guide, Pricing, Contact, Demo
- **Email Digest**: 회사별 SMTP 설정 + 외부 이메일 수신자 지원 (Settings > Email Digest)
- **인앱 도움말**: 각 대시보드 페이지에 "?" 플로팅 버튼 → 사이드 패널 (10개 페이지 커버리지)
- **Help Center**: `/help` 페이지에 5개 카테고리별 문서 + 검색 기능
- **Interactive Demo**: `/demo` 페이지에서 가입 없이 AI OCR 체험 (mock 데이터 + AI Confidence Score)
