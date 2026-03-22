import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# 사용량 제한이 적용되는 경로 매핑
# (method, path_prefix) → usage field
USAGE_LIMITED_ROUTES = {
    ("POST", "/api/v1/invoices"): "invoice_count",
}

# OCR 관련 경로
OCR_ROUTES = {
    ("POST", "/api/v1/invoices/upload"): "ocr_count",
    ("POST", "/api/v1/invoices/ocr"): "ocr_count",
}


class UsageLimiterMiddleware(BaseHTTPMiddleware):
    """플랜 사용량 한도 체크 미들웨어"""

    async def dispatch(self, request: Request, call_next):
        method = request.method
        path = request.url.path

        # 사용량 제한이 필요한 경로인지 확인
        field = None
        for (m, prefix), f in {**USAGE_LIMITED_ROUTES, **OCR_ROUTES}.items():
            if method == m and path.startswith(prefix):
                field = f
                break

        if not field:
            return await call_next(request)

        # 인증된 사용자의 company_id 가져오기
        # (Authorization 헤더에서 토큰 디코딩 — 미들웨어이므로 직접 처리)
        company_id = None
        try:
            from app.core.security import decode_token
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                payload = decode_token(token)
                company_id_str = payload.get("company_id")
                if company_id_str:
                    from uuid import UUID
                    company_id = UUID(company_id_str)
        except Exception:
            pass  # 인증 실패는 다른 미들웨어/dependency에서 처리

        if not company_id:
            return await call_next(request)

        # 사용량 한도 체크
        try:
            from app.core.database import AsyncSessionLocal
            async with AsyncSessionLocal() as db:
                from app.services.billing_service import check_usage_limit
                within_limit = await check_usage_limit(db, company_id, field)
                if not within_limit:
                    limit_names = {
                        "invoice_count": "invoice",
                        "ocr_count": "OCR",
                        "user_count": "user",
                    }
                    return JSONResponse(
                        status_code=403,
                        content={
                            "detail": f"Monthly {limit_names.get(field, field)} limit reached. "
                                      f"Please upgrade your plan.",
                        },
                    )
        except Exception as e:
            logger.warning("Usage limit check failed: %s", e)

        return await call_next(request)
