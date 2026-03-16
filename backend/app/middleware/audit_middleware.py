"""
Audit 미들웨어
데이터 변경 요청(POST/PUT/PATCH/DELETE)을 audit_logs 테이블에 기록.
현재는 로그 구조만 준비하고, audit_logs 테이블은 Phase 7에서 생성.
"""
import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.context import get_current_user_id, get_current_company_id

logger = logging.getLogger("audit")

# 감사 대상 HTTP 메서드
AUDIT_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# 감사 제외 경로
EXCLUDE_PATHS = {
    "/health",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
}


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # GET 등 읽기 요청은 감사 불필요
        if request.method not in AUDIT_METHODS:
            return await call_next(request)

        # 제외 경로
        if request.url.path in EXCLUDE_PATHS:
            return await call_next(request)

        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000)

        # 감사 로그 기록
        user_id = get_current_user_id()
        company_id = get_current_company_id()

        logger.info(
            "AUDIT | method=%s path=%s status=%s user=%s company=%s duration=%dms",
            request.method,
            request.url.path,
            response.status_code,
            user_id,
            company_id,
            duration_ms,
        )

        # TODO: Phase 7에서 audit_logs 테이블 생성 후 DB 기록으로 전환
        # await save_audit_log(
        #     company_id=company_id,
        #     user_id=user_id,
        #     action=request.method,
        #     entity_type=extract_entity_type(request.url.path),
        #     ip_address=request.client.host,
        #     user_agent=request.headers.get("user-agent"),
        # )

        return response
