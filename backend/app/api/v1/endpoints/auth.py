from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.auth import (
    RegisterRequest,
    VerifyEmailRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    LogoutRequest,
    AccessTokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services import auth_service

router = APIRouter()

REFRESH_COOKIE_KEY = "refresh_token"


@router.post("/register", response_model=MessageResponse, status_code=201)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """셀프서비스 회원가입 — 회사 자동 생성 + COMPANY_ADMIN 설정 + 이메일 인증 토큰 발송"""
    await auth_service.register(
        db,
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        company_name=data.company_name,
    )
    return {"message": "Registration successful. Please check your email to verify your account."}


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """이메일 인증 확인"""
    await auth_service.verify_email(db, data.token)
    return {"message": "Email verified successfully. You can now sign in."}


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    data: ForgotPasswordRequest,  # email만 필요하므로 기존 스키마 재사용
    db: AsyncSession = Depends(get_db),
):
    """이메일 인증 토큰 재발송"""
    await auth_service.resend_verification(db, data.email)
    return {"message": "If the email is registered and not verified, a new verification link will be sent."}


def _set_refresh_cookie(response: Response, token: str) -> None:
    """refresh token을 HttpOnly 쿠키로 설정"""
    response.set_cookie(
        key=REFRESH_COOKIE_KEY,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth",  # auth 엔드포인트에서만 전송
    )


def _clear_refresh_cookie(response: Response) -> None:
    """refresh token 쿠키 삭제"""
    response.delete_cookie(
        key=REFRESH_COOKIE_KEY,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/api/v1/auth",
    )


@router.post("/login", response_model=AccessTokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """로그인 — access token은 응답 본문, refresh token은 HttpOnly 쿠키로 발급"""
    user = await auth_service.authenticate(db, data.email, data.password)
    tokens = auth_service.issue_tokens(user)
    _set_refresh_cookie(response, tokens["refresh_token"])
    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    response: Response,
    db: AsyncSession = Depends(get_db),
    data: RefreshRequest | None = None,
    refresh_token: str | None = Cookie(None),
):
    """토큰 갱신 — 쿠키 또는 요청 본문의 refresh token으로 새 access token 발급"""
    # 쿠키 우선, 본문 fallback (하위 호환)
    token = refresh_token or (data.refresh_token if data else None)
    if not token:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not provided",
        )
    result = await auth_service.refresh_access_token(db, token)
    # 쿠키 갱신 (토큰 로테이션은 하지 않지만 만료시간 연장)
    _set_refresh_cookie(response, token)
    return result


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """비밀번호 리셋 이메일 발송 — 보안상 항상 동일 메시지 응답"""
    await auth_service.request_password_reset(db, data.email)
    return {"message": "If the email is registered, a password reset link will be sent."}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """비밀번호 재설정"""
    await auth_service.reset_password(db, data.token, data.new_password)
    return {"message": "Password has been successfully changed. Please sign in with your new password."}


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    data: LogoutRequest | None = None,
    refresh_token: str | None = Cookie(None),
):
    """로그아웃 — refresh token을 블랙리스트에 등록하여 재사용 차단"""
    token = refresh_token or (data.refresh_token if data else None)
    if token:
        await auth_service.blacklist_refresh_token(token)
    _clear_refresh_cookie(response)
    return None
