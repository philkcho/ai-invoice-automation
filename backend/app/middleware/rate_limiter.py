"""
Rate Limiter 미들웨어
설계서 기준: IP당 100 req/min, 회사당 1000 req/min.
Redis를 사용한 슬라이딩 윈도우 방식.
"""
import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.context import get_current_company_id

logger = logging.getLogger(__name__)

# 제한 설정
IP_RATE_LIMIT = settings.RATE_LIMIT_IP_PER_MIN
COMPANY_RATE_LIMIT = settings.RATE_LIMIT_COMPANY_PER_MIN
WINDOW_SECONDS = 60


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)

    def _get_redis(self):
        """main.py에서 초기화된 redis_client를 가져옴"""
        try:
            from app.main import redis_client
            return redis_client
        except ImportError:
            return None

    async def _check_rate_limit(self, redis, key: str, limit: int) -> bool:
        """Redis sorted set 기반 슬라이딩 윈도우"""
        now = time.time()
        window_start = now - WINDOW_SECONDS
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, WINDOW_SECONDS + 1)
        results = await pipe.execute()
        count = results[2]
        return count <= limit

    async def dispatch(self, request: Request, call_next) -> Response:
        redis = self._get_redis()

        # Redis 없으면 제한 없이 통과
        if not redis:
            return await call_next(request)

        # health 엔드포인트 제외
        if request.url.path in {"/health", "/docs", "/redoc", "/openapi.json"}:
            return await call_next(request)

        try:
            # IP 기반 제한
            client_ip = request.client.host if request.client else "unknown"
            ip_key = f"rate_limit:ip:{client_ip}"

            if not await self._check_rate_limit(redis, ip_key, IP_RATE_LIMIT):
                return JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded: {IP_RATE_LIMIT} requests per minute"},
                )

            # 회사 기반 제한 (컨텍스트가 설정된 경우만)
            company_id = get_current_company_id()
            if company_id:
                company_key = f"rate_limit:company:{company_id}"
                if not await self._check_rate_limit(redis, company_key, COMPANY_RATE_LIMIT):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": f"Company rate limit exceeded: {COMPANY_RATE_LIMIT} requests per minute"},
                    )
        except Exception as e:
            # Redis 오류 시 요청을 차단하지 않고 통과시킴
            logger.warning("Rate limiter error (allowing request): %s", e)

        return await call_next(request)
