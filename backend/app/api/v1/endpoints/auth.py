from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    AccessTokenResponse,
)
from app.services import auth_service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """로그인 — access + refresh token 발급"""
    user = await auth_service.authenticate(db, data.email, data.password)
    return auth_service.issue_tokens(user)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """토큰 갱신 — refresh token으로 새 access token 발급"""
    return await auth_service.refresh_access_token(db, data.refresh_token)


@router.post("/logout", status_code=204)
async def logout():
    """로그아웃 — 클라이언트에서 토큰 삭제 처리 (서버는 stateless)"""
    return None
