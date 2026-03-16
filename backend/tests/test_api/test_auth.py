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
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


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
    # 먼저 로그인
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "password123",
    })
    refresh_token = login_response.json()["refresh_token"]

    # refresh로 새 access token 발급
    response = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(client, test_super_admin: User):
    login_response = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "password123",
    })
    access_token = login_response.json()["access_token"]

    response = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": access_token,
    })
    assert response.status_code == 401
