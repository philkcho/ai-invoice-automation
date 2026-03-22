import pytest
from app.models.user import User


@pytest.mark.asyncio
async def test_login_success(client, test_super_admin: User):
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    # refresh_token은 HttpOnly 쿠키로 전달
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client, test_super_admin: User):
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "password123",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client, test_super_admin: User):
    # 먼저 로그인하여 refresh_token 쿠키 획득
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "password123",
    })
    assert login_response.status_code == 200

    # 쿠키에서 refresh_token 추출하여 요청 본문으로 전달
    refresh_tok = login_response.cookies.get("refresh_token", "")
    response = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_tok,
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_refresh_with_invalid_token_fails(client):
    response = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": "invalid.token.string",
    })
    assert response.status_code == 401
