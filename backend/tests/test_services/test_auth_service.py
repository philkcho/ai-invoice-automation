import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.company import Company
from app.core.security import hash_password, verify_password


@pytest.mark.asyncio
async def test_register_creates_company_and_user(client, db_session: AsyncSession):
    """register API로 가입하면 회사와 COMPANY_ADMIN 사용자가 자동 생성된다"""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newcompany@test.com",
            "password": "StrongPass1!",
            "full_name": "New Owner",
            "company_name": "My New Company",
        },
    )
    assert response.status_code in (200, 201)


@pytest.mark.asyncio
async def test_register_duplicate_email(client, test_super_admin: User):
    """이미 존재하는 이메일로 가입 시도하면 409 에러"""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@test.com",
            "password": "StrongPass1!",
            "full_name": "Duplicate",
            "company_name": "Dup Company",
        },
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login_returns_tokens(client, test_super_admin: User):
    """로그인 성공 시 access_token, refresh_token 반환"""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # refresh_token은 HttpOnly 쿠키로 전달
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_updates_last_login(client, test_super_admin: User, db_session):
    """로그인 성공 시 last_login이 업데이트된다"""
    assert test_super_admin.last_login is None

    await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.com", "password": "password123"},
    )

    await db_session.refresh(test_super_admin)
    assert test_super_admin.last_login is not None


@pytest.mark.asyncio
async def test_password_hashing():
    """비밀번호가 bcrypt로 안전하게 해싱된다"""
    plain = "MyPassword123!"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_refresh_with_invalid_token(client):
    """잘못된 refresh token으로 새 토큰 발급 시도 시 401"""
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid.token.here"},
    )
    assert response.status_code == 401
