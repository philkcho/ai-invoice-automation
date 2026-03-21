import logging

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.middleware import CompanyContextMiddleware, RateLimiterMiddleware, AuditMiddleware

logger = logging.getLogger(__name__)


# ── Sentry 초기화 ─────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.2,
    )


# ── Redis 클라이언트 ──────────────────────────────────
redis_client = None


async def _init_redis():
    """Redis 비동기 클라이언트 초기화"""
    global redis_client
    try:
        import redis.asyncio as aioredis
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        await redis_client.ping()
        logger.info("Redis 연결 성공: %s", settings.REDIS_URL)
    except Exception as e:
        logger.warning("Redis 연결 실패 — Rate Limiting 비활성화: %s", e)
        redis_client = None


async def _close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


# ── 앱 시작/종료 이벤트 ───────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await _init_redis()
    # startup: DB 테이블 확인 (개발 환경에서만 — 운영은 alembic 사용)
    if settings.DEBUG:
        async with engine.begin() as conn:
            pass
    yield
    # shutdown
    await _close_redis()
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


# ── 글로벌 에러 핸들러 ────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """처리되지 않은 예외를 표준 JSON 응답으로 변환"""
    logger.error("Unhandled exception: %s %s — %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__,
        },
    )


from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic 유효성 검증 오류를 표준 포맷으로"""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": [
                {
                    "field": ".".join(str(loc) for loc in err["loc"]),
                    "message": err["msg"],
                    "type": err["type"],
                }
                for err in exc.errors()
            ],
        },
    )


from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTPException을 표준 포맷으로"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


# ── CORS (환경변수에서 origins 로드) ─────────────────
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 미들웨어 등록 (실행 순서: 아래에서 위로) ──────────
app.add_middleware(AuditMiddleware)
# Redis 클라이언트는 lifespan에서 초기화 후 주입
# RateLimiterMiddleware는 __init__ 시점에 redis=None으로 등록되지만,
# dispatch에서 app.state.redis를 참조하도록 개선
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(CompanyContextMiddleware)

# ── 라우터 등록 ───────────────────────────────────────
from app.api.v1.endpoints import (
    auth, companies, users, vendors, tax_rates,
    purchase_orders, invoice_types, global_rules, type_rules, vendor_contracts,
    invoices, exchange_rates, notifications,
    approval_settings, approvals, payments,
    email_configurations, dashboard, reports,
    company_type_settings, recurring_amounts, linkage_details,
    company_policies, chat,
)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["Companies"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(vendors.router, prefix="/api/v1/vendors", tags=["Vendors"])
app.include_router(tax_rates.router, prefix="/api/v1/tax-rates", tags=["Tax Rates"])
app.include_router(purchase_orders.router, prefix="/api/v1/purchase-orders", tags=["Purchase Orders"])
app.include_router(invoice_types.router, prefix="/api/v1/invoice-types", tags=["Invoice Types"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Invoices"])
app.include_router(exchange_rates.router, prefix="/api/v1/exchange-rates", tags=["Exchange Rates"])
app.include_router(global_rules.router, prefix="/api/v1/global-rules", tags=["Global Rules"])
app.include_router(type_rules.router, prefix="/api/v1/type-rules", tags=["Type Rules"])
app.include_router(vendor_contracts.router, prefix="/api/v1/vendor-contracts", tags=["Vendor Contracts"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(approval_settings.router, prefix="/api/v1/approval-settings", tags=["Approval Settings"])
app.include_router(approvals.router, prefix="/api/v1/approvals", tags=["Approvals"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(email_configurations.router, prefix="/api/v1/email-configurations", tags=["Email Configurations"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(company_type_settings.router, prefix="/api/v1/company-type-settings", tags=["Company Type Settings"])
app.include_router(recurring_amounts.router, prefix="/api/v1/recurring-amounts", tags=["Recurring Amounts"])
app.include_router(linkage_details.router, prefix="/api/v1/linkage-details", tags=["Linkage Details"])
app.include_router(company_policies.router, prefix="/api/v1/company-policies", tags=["Company Policies"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])


# ── 헬스 체크 ─────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """경량 헬스체크 (Docker healthcheck용)"""
    checks = {}
    overall = "healthy"

    # Redis
    if redis_client:
        try:
            await redis_client.ping()
            checks["redis"] = "connected"
        except Exception:
            checks["redis"] = "disconnected"
            overall = "degraded"
    else:
        checks["redis"] = "disconnected"
        overall = "degraded"

    # DB
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception:
        checks["database"] = "disconnected"
        overall = "unhealthy"

    status_code = 200 if overall != "unhealthy" else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "environment": settings.ENVIRONMENT,
            "checks": checks,
        },
    )


@app.get("/health/detail", tags=["System"])
async def health_check_detail():
    """상세 헬스체크 (SUPER_ADMIN 전용 — 인증은 추후 적용)"""
    import shutil
    import time

    checks = {}
    overall = "healthy"

    # DB 연결 + 레이턴시
    try:
        from sqlalchemy import text
        start = time.monotonic()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        latency = round((time.monotonic() - start) * 1000, 1)
        checks["database"] = {"status": "connected", "latency_ms": latency}
    except Exception as e:
        checks["database"] = {"status": "disconnected", "error": str(e)}
        overall = "unhealthy"

    # Redis 연결 + 레이턴시
    if redis_client:
        try:
            start = time.monotonic()
            await redis_client.ping()
            latency = round((time.monotonic() - start) * 1000, 1)
            checks["redis"] = {"status": "connected", "latency_ms": latency}
        except Exception as e:
            checks["redis"] = {"status": "disconnected", "error": str(e)}
            overall = "degraded"
    else:
        checks["redis"] = {"status": "disconnected"}
        overall = "degraded"

    # Celery 워커 상태
    try:
        from app.tasks.celery_app import celery_app as _celery
        inspect = _celery.control.inspect(timeout=5)
        active = inspect.active()
        if active:
            checks["celery"] = {"status": "active", "workers": len(active)}
        else:
            checks["celery"] = {"status": "inactive", "workers": 0}
            overall = "degraded"
    except Exception as e:
        checks["celery"] = {"status": "error", "error": str(e)}
        overall = "degraded"

    # 디스크 공간
    try:
        usage = shutil.disk_usage("/")
        free_gb = round(usage.free / (1024 ** 3), 1)
        usage_pct = round((usage.used / usage.total) * 100, 1)
        disk_status = "ok" if usage_pct < 85 else ("warning" if usage_pct < 95 else "critical")
        checks["disk"] = {
            "status": disk_status,
            "free_gb": free_gb,
            "usage_percent": usage_pct,
        }
        if disk_status == "critical":
            overall = "degraded"
    except Exception as e:
        checks["disk"] = {"status": "error", "error": str(e)}

    status_code = 200 if overall != "unhealthy" else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "checks": checks,
        },
    )
