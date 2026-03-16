"""
Rate Limiter 미들웨어
설계서 기준: IP당 100 req/min, 회사당 1000 req/min.
Redis를 사용한 슬라이딩 윈도우 방식.
"""
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.context import get_current_company_id

# 제한 설정
IP_RATE_LIMIT = 100  # requests per minute
COMPANY_RATE_LIMIT = 1000  # requests per minute
WINDOW_SECONDS = 60


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_client=None):
        super().__init__(app)
        self.redis = redis_client

    async def _check_rate_limit(self, key: str, limit: int) -> bool:
        """Redis sorted set 기반 슬라이딩 윈도우. Redis 미연결 시 통과."""
        if not self.redis:
            return True

        now = time.time()
        window_start = now - WINDOW_SECONDS
        pipe = self.redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, WINDOW_SECONDS + 1)
        results = await pipe.execute()
        count = results[2]
        return count <= limit

    async def dispatch(self, request: Request, call_next) -> Response:
        # Redis 없으면 제한 없이 통과
        if not self.redis:
            return await call_next(request)

        # IP 기반 제한
        client_ip = request.client.host if request.client else "unknown"
        ip_key = f"rate_limit:ip:{client_ip}"

        if not await self._check_rate_limit(ip_key, IP_RATE_LIMIT):
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded: {IP_RATE_LIMIT} requests per minute"},
            )

        # 회사 기반 제한 (컨텍스트가 설정된 경우만)
        company_id = get_current_company_id()
        if company_id:
            company_key = f"rate_limit:company:{company_id}"
            if not await self._check_rate_limit(company_key, COMPANY_RATE_LIMIT):
                return JSONResponse(
                    status_code=429,
                    content={"detail": f"Company rate limit exceeded: {COMPANY_RATE_LIMIT} requests per minute"},
                )

        return await call_next(request)
