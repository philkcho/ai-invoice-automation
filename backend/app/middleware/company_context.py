"""
회사 컨텍스트 미들웨어
인증된 요청에서 JWT의 company_id를 ContextVar에 자동 주입.
인증이 필요 없는 경로(health, docs 등)는 건너뜀.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from uuid import UUID

from app.core.context import set_company_context, current_company_id, current_user_id, current_user_role
from app.core.security import decode_token

# 인증 없이 접근 가능한 경로
PUBLIC_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class CompanyContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # 공개 경로는 컨텍스트 설정 없이 통과
        if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/api/v1/auth"):
            return await call_next(request)

        # Authorization 헤더가 없으면 통과 (엔드포인트 레벨에서 401 처리)
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return await call_next(request)

        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)

            if payload.get("type") == "access":
                user_id = UUID(payload["sub"])
                company_id = UUID(payload["company_id"]) if payload.get("company_id") else None
                role = payload["role"]
                set_company_context(company_id, user_id, role)
        except Exception:
            # 토큰 검증 실패는 엔드포인트의 Depends(get_current_user)에서 처리
            pass

        response = await call_next(request)

        # 요청 종료 후 컨텍스트 초기화
        current_company_id.set(None)
        current_user_id.set(None)
        current_user_role.set(None)

        return response
