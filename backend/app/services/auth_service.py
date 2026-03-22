import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User
from app.core.config import settings
from app.core.security import (
    verify_password,
    hash_password,
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


async def register(
    db: AsyncSession, email: str, password: str, full_name: str, company_name: str
) -> User:
    """셀프서비스 가입: 회사 자동 생성 + 사용자를 COMPANY_ADMIN으로 등록 + 이메일 인증 토큰 발송"""
    from app.models.company import Company
    import re

    # 이메일 중복 확인
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # company_code 자동 생성 (회사명에서 영문/숫자만 추출 + UUID 일부)
    import uuid as _uuid
    code_base = re.sub(r"[^a-zA-Z0-9]", "", company_name)[:10].upper()
    if not code_base:
        code_base = "COMP"
    company_code = f"{code_base}-{str(_uuid.uuid4())[:4].upper()}"

    # 회사 생성
    company = Company(
        company_code=company_code,
        company_name=company_name,
        contact_email=email,
        contact_name=full_name,
    )
    db.add(company)
    await db.flush()

    # 사용자 생성 (COMPANY_ADMIN, email_verified=False)
    user = User(
        company_id=company.id,
        email=email,
        full_name=full_name,
        role="COMPANY_ADMIN",
        password_hash=hash_password(password),
        email_verified=False,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Free Trial 구독 자동 생성
    try:
        from app.services.billing_service import create_trial_subscription
        await create_trial_subscription(db, company.id)
    except Exception as e:
        logger.warning("Failed to create trial subscription: %s", e)

    # 이메일 인증 토큰 생성 및 발송
    await _send_verification_token(email)

    await db.commit()

    logger.info("New user registered: %s (company: %s)", email, company_name)
    return user


async def _send_verification_token(email: str) -> None:
    """이메일 인증 토큰 생성 → Redis 저장 → Celery 이메일 발송"""
    from jose import jwt
    from datetime import timedelta

    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    token = jwt.encode(
        {"sub": email, "type": "email_verification", "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    # Redis에 저장 (24시간 유효)
    redis = _get_redis()
    if redis:
        try:
            await redis.setex(f"email_verify:{email}", 86400, token)
        except Exception as e:
            logger.warning("Redis email verification token store failed: %s", e)

    # Celery 태스크로 이메일 발송
    try:
        from app.tasks.notification_tasks import send_verification_email
        send_verification_email.delay(email, token)
    except Exception as e:
        logger.error("Failed to queue verification email: %s", e)


async def verify_email(db: AsyncSession, token: str) -> None:
    """이메일 인증 토큰 확인 → email_verified=True 설정"""
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    if payload.get("type") != "email_verification":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type",
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not contain email information",
        )

    # Redis 토큰 일치 확인 (재사용 방지)
    redis = _get_redis()
    if redis:
        try:
            stored_token = await redis.get(f"email_verify:{email}")
            if not stored_token or stored_token != token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token has already been used or is invalid",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Redis email verification token check failed: %s", e)

    # 사용자 조회 및 인증 상태 업데이트
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    if user.email_verified:
        # 이미 인증됨 — 에러가 아니라 성공 응답
        return

    user.email_verified = True
    await db.flush()

    # Redis 키 삭제
    if redis:
        try:
            await redis.delete(f"email_verify:{email}")
        except Exception as e:
            logger.warning("Redis email verification token delete failed: %s", e)

    await db.commit()
    logger.info("Email verified for %s", email)


async def resend_verification(db: AsyncSession, email: str) -> None:
    """이메일 인증 토큰 재발송"""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or user.email_verified:
        return  # 보안상 존재 여부 노출하지 않음

    await _send_verification_token(email)


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    """이메일+비밀번호 인증 → User 반환"""
    # 로그인 시도 횟수 확인
    await _check_login_attempts(email)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        await _record_login_failure(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not registered",
        )

    if not verify_password(password, user.password_hash):
        await _record_login_failure(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
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
        "refresh_token": create_refresh_token(user.id, user.company_id),
        "token_type": "bearer",
    }


async def blacklist_refresh_token(refresh_token: str) -> None:
    """refresh token을 Redis 블랙리스트에 추가 (남은 TTL만큼 유지)"""
    redis = _get_redis()
    if not redis:
        logger.warning("Redis unavailable — refresh token blacklist skipped")
        return

    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            return
        exp = int(payload.get("exp", 0))
        ttl = exp - int(datetime.now(timezone.utc).timestamp())
        if ttl > 0:
            # 토큰 앞 32자를 키로 사용 (충돌 방지 + 메모리 절약)
            await redis.setex(f"token_blacklist:{refresh_token[:32]}", ttl, "1")
    except Exception as e:
        logger.warning("Failed to blacklist refresh token: %s", e)


async def _is_token_blacklisted(refresh_token: str) -> bool:
    """refresh token이 블랙리스트에 있는지 확인"""
    redis = _get_redis()
    if not redis:
        return False

    try:
        result = await redis.get(f"token_blacklist:{refresh_token[:32]}")
        return result is not None
    except Exception as e:
        logger.warning("Token blacklist check failed: %s", e)
        return False


async def request_password_reset(db: AsyncSession, email: str) -> None:
    """비밀번호 리셋 요청 — 이메일 존재 여부와 무관하게 조용히 처리 (보안)"""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return

    if not user.is_active:
        return

    # JWT 리셋 토큰 생성
    from jose import jwt
    from datetime import timedelta

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )
    token = jwt.encode(
        {"sub": email, "type": "password_reset", "exp": expire},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    # Redis에 저장 (재사용 방지)
    redis = _get_redis()
    if redis:
        try:
            await redis.setex(
                f"password_reset:{email}",
                settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES * 60,
                token,
            )
        except Exception as e:
            logger.warning("Redis password reset token store failed: %s", e)

    # Celery 태스크로 이메일 발송
    try:
        from app.tasks.notification_tasks import send_password_reset_email
        send_password_reset_email.delay(email, token)
    except Exception as e:
        logger.error("Failed to queue password reset email: %s", e)


async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
    """비밀번호 리셋 실행"""
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token",
        )

    if payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token type",
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not contain email information",
        )

    # Redis에서 토큰 일치 확인 (재사용 방지)
    redis = _get_redis()
    if redis:
        try:
            stored_token = await redis.get(f"password_reset:{email}")
            if not stored_token or stored_token != token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token has already been used or is invalid",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("Redis password reset token check failed: %s", e)

    # 사용자 조회 및 비밀번호 업데이트
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    user.password_hash = hash_password(new_password)
    await db.flush()

    # Redis 키 삭제를 DB commit 전에 수행
    # (commit 실패 시 토큰 재발급 가능하므로 안전, 반대로 commit 후 Redis 삭제 실패 시 토큰 재사용 위험)
    if redis:
        try:
            await redis.delete(f"password_reset:{email}")
        except Exception as e:
            logger.warning("Redis password reset token delete failed: %s", e)

    await db.commit()

    # 로그인 시도 횟수 초기화
    await _clear_login_attempts(email)

    logger.info("Password reset successful for %s", email)


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict:
    """refresh token으로 새 access token 발급"""
    # 블랙리스트 체크
    if await _is_token_blacklisted(refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

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

    # 토큰 payload의 company_id와 현재 DB의 company_id 일치 검증
    # (회사 변경 후 이전 토큰으로 접근 방지)
    token_company_id = payload.get("company_id")
    if token_company_id and user.company_id and str(user.company_id) != token_company_id:
        logger.warning(
            "Refresh token company mismatch for user %s: token=%s, db=%s",
            user_id, token_company_id, user.company_id,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Company assignment changed. Please log in again.",
        )

    return {
        "access_token": create_access_token(user.id, user.company_id, user.role),
        "token_type": "bearer",
    }
