import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.middleware import CompanyContextMiddleware, RateLimiterMiddleware, AuditMiddleware


# ── Sentry 초기화 ─────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.2,
    )


# ── 앱 시작/종료 이벤트 ───────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: DB 테이블 확인 (개발 환경에서만 — 운영은 alembic 사용)
    if settings.DEBUG:
        async with engine.begin() as conn:
            # 개발 중 자동 생성 (운영에서는 주석 처리)
            # await conn.run_sync(Base.metadata.create_all)
            pass
    yield
    # shutdown
    await engine.dispose()


# ── FastAPI 앱 ────────────────────────────────────────
app = FastAPI(
    title="AI Invoice Automation System",
    description="AI-powered multi-company invoice processing, validation, approval, and payment tracking",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 미들웨어 등록 (실행 순서: 아래에서 위로) ──────────
app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimiterMiddleware, redis_client=None)  # Phase 2에서 Redis 연결 후 활성화
app.add_middleware(CompanyContextMiddleware)

# ── 라우터 등록 (Phase별로 추가 예정) ─────────────────
from app.api.v1.endpoints import auth, companies, users
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])


# ── 헬스 체크 ─────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
