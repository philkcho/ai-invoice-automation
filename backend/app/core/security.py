from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings
from app.core.context import set_company_context

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


# ── 비밀번호 ─────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT 토큰 ──────────────────────────────────────────
def create_access_token(
    user_id: UUID,
    company_id: Optional[UUID],
    role: str,
) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "company_id": str(company_id) if company_id else None,
        "role": role,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI 의존성 ─────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """JWT 검증 + company 컨텍스트 주입"""
    payload = decode_token(credentials.credentials)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = UUID(payload["sub"])
    company_id = UUID(payload["company_id"]) if payload.get("company_id") else None
    role = payload["role"]

    # 컨텍스트 변수에 저장 (미들웨어 역할)
    set_company_context(company_id, user_id, role)

    return {"user_id": user_id, "company_id": company_id, "role": role}


def require_roles(*roles: str):
    """특정 역할 이상만 접근 허용하는 의존성 팩토리"""
    async def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {', '.join(roles)}",
            )
        return current_user
    return dependency


# 역할 상수
ROLE_SUPER_ADMIN = "SUPER_ADMIN"
ROLE_COMPANY_ADMIN = "COMPANY_ADMIN"
ROLE_ACCOUNTANT = "ACCOUNTANT"
ROLE_APPROVER = "APPROVER"
ROLE_VIEWER = "VIEWER"

# 자주 쓰는 조합
require_super_admin = require_roles(ROLE_SUPER_ADMIN)
require_admin = require_roles(ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN)
require_accountant_up = require_roles(ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN, ROLE_ACCOUNTANT)
require_approver_up = require_roles(ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN, ROLE_APPROVER)
require_any = require_roles(ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN, ROLE_ACCOUNTANT, ROLE_APPROVER, ROLE_VIEWER)
