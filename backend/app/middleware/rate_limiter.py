"""
Rate Limiter 미들웨어
설계서 기준: IP당 100 req/min, 회사당 1000 req/min.
Redis를 사용한 슬라이딩 윈도우 방식. Redis 장애 시 인메모리 fallback.
"""
import time
import logging
from collections import defaultdict
from threading import Lock

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


class InMemoryRateLimiter:
    """Redis 장애 시 사용되는 인메모리 fallback rate limiter"""

    def __init__(self):
        self._buckets: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str, limit: int) -> bool:
        now = time.time()
        window_start = now - WINDOW_SECONDS
        with self._lock:
            # 만료된 항목 제거
            self._buckets[key] = [t for t in self._buckets[key] if t > window_start]
            if len(self._buckets[key]) >= limit:
                return False
            self._buckets[key].append(now)
            # 메모리 누수 방지: 키가 너무 많아지면 오래된 것 정리
            if len(self._buckets) > 10000:
                stale_keys = [k for k, v in self._buckets.items() if not v or v[-1] < window_start]
                for k in stale_keys:
                    del self._buckets[k]
            return True


class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._fallback = InMemoryRateLimiter()

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
        # health 엔드포인트 제외
        if request.url.path in {"/health", "/docs", "/redoc", "/openapi.json"}:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        ip_key = f"rate_limit:ip:{client_ip}"

        redis = self._get_redis()

        try:
            if redis:
                # Redis 기반 제한
                if not await self._check_rate_limit(redis, ip_key, IP_RATE_LIMIT):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": f"Rate limit exceeded: {IP_RATE_LIMIT} requests per minute"},
                    )

                company_id = get_current_company_id()
                if company_id:
                    company_key = f"rate_limit:company:{company_id}"
                    if not await self._check_rate_limit(redis, company_key, COMPANY_RATE_LIMIT):
                        return JSONResponse(
                            status_code=429,
                            content={"detail": f"Company rate limit exceeded: {COMPANY_RATE_LIMIT} requests per minute"},
                        )
            else:
                # Redis 없으면 인메모리 fallback
                if not self._fallback.check(ip_key, IP_RATE_LIMIT):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": f"Rate limit exceeded: {IP_RATE_LIMIT} requests per minute"},
                    )
        except Exception as e:
            # Redis 오류 시 인메모리 fallback으로 전환
            logger.warning("Rate limiter Redis error, using in-memory fallback: %s", e)
            if not self._fallback.check(ip_key, IP_RATE_LIMIT):
                return JSONResponse(
                    status_code=429,
                    content={"detail": f"Rate limit exceeded: {IP_RATE_LIMIT} requests per minute"},
                )

        return await call_next(request)
