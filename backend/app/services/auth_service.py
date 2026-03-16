import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User
from app.core.config import settings
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

logger = logging.getLogger(__name__)


def _get_redis():
    """main.py에서 초기화된 redis_client 참조"""
    try:
        from app.main import redis_client
        return redis_client
    except ImportError:
        return None


async def _check_login_attempts(email: str) -> None:
    """로그인 시도 횟수 확인 — 초과 시 HTTPException 발생"""
    redis = _get_redis()
    if not redis:
        return

    key = f"login_attempts:{email}"
    try:
        attempts = await redis.get(key)
        if attempts and int(attempts) >= settings.LOGIN_MAX_ATTEMPTS:
            ttl = await redis.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Try again in {max(ttl, 0)} seconds.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Login attempt check failed: %s", e)


async def _record_login_failure(email: str) -> None:
    """로그인 실패 기록"""
    redis = _get_redis()
    if not redis:
        return

    key = f"login_attempts:{email}"
    try:
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, settings.LOGIN_LOCKOUT_MINUTES * 60)
        await pipe.execute()
    except Exception as e:
        logger.warning("Login failure record failed: %s", e)


async def _clear_login_attempts(email: str) -> None:
    """로그인 성공 시 시도 횟수 초기화"""
    redis = _get_redis()
    if not redis:
        return

    try:
        await redis.delete(f"login_attempts:{email}")
    except Exception as e:
        logger.warning("Login attempts clear failed: %s", e)


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    """이메일+비밀번호 인증 → User 반환"""
    # 로그인 시도 횟수 확인
    await _check_login_attempts(email)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        # 실패 기록
        await _record_login_failure(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # 성공 시 시도 횟수 초기화
    await _clear_login_attempts(email)

    # last_login 업데이트
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    return user


def issue_tokens(user: User) -> dict:
    """access + refresh token 발급"""
    return {
        "access_token": create_access_token(user.id, user.company_id, user.role),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    """refresh token으로 새 access token 발급"""
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type: expected refresh token",
        )

    from uuid import UUID
    user_id = UUID(payload["sub"])

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return {
        "access_token": create_access_token(user.id, user.company_id, user.role),
        "token_type": "bearer",
    }
