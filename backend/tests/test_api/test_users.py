import pytest
from app.models.user import User
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_get_me(client, test_company_admin: User):
    response = await client.get(
        "/api/v1/users/me",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "companyadmin@test.com"
    assert data["role"] == "COMPANY_ADMIN"


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_user_by_super_admin(client, test_super_admin: User, test_company):
    response = await client.post(
        "/api/v1/users",
        json={
            "company_id": str(test_company.id),
            "email": "newuser@test.com",
            "full_name": "New User",
            "role": "ACCOUNTANT",
            "password": "Password1!",
        },
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "ACCOUNTANT"


@pytest.mark.asyncio
async def test_create_user_by_company_admin(client, test_company_admin: User, test_company):
    response = await client.post(
        "/api/v1/users",
        json={
            "company_id": str(test_company.id),
            "email": "staff@test.com",
            "full_name": "Staff Member",
            "role": "VIEWER",
            "password": "Password1!",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 201
    assert response.json()["role"] == "VIEWER"


@pytest.mark.asyncio
async def test_create_user_duplicate_email(client, test_super_admin: User, test_company):
    response = await client.post(
        "/api/v1/users",
        json={
            "company_id": str(test_company.id),
            "email": "admin@test.com",
            "full_name": "Duplicate",
            "role": "VIEWER",
            "password": "Password1!",
        },
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_user_by_viewer_forbidden(client, test_viewer: User, test_company):
    response = await client.post(
        "/api/v1/users",
        json={
            "company_id": str(test_company.id),
            "email": "nope@test.com",
            "full_name": "Nope",
            "role": "VIEWER",
            "password": "Password1!",
        },
        headers=auth_header(test_viewer),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users(client, test_super_admin: User, test_company_admin):
    response = await client.get(
        "/api/v1/users",
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_user_by_id(client, test_super_admin: User, test_company_admin: User):
    response = await client.get(
        f"/api/v1/users/{test_company_admin.id}",
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 200
    assert response.json()["email"] == "companyadmin@test.com"


@pytest.mark.asyncio
async def test_update_user(client, test_super_admin: User, test_company_admin: User):
    response = await client.patch(
        f"/api/v1/users/{test_company_admin.id}",
        json={"full_name": "Updated Admin"},
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Admin"


@pytest.mark.asyncio
async def test_change_password(client, test_company_admin: User):
    response = await client.post(
        f"/api/v1/users/{test_company_admin.id}/change-password",
        json={
            "current_password": "password123",
            "new_password": "NewPassword1!",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code in (200, 204)


@pytest.mark.asyncio
async def test_change_password_wrong_current(client, test_company_admin: User):
    response = await client.post(
        f"/api/v1/users/{test_company_admin.id}/change-password",
        json={
            "current_password": "wrongpassword",
            "new_password": "NewPassword1!",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code in (400, 401, 403)


@pytest.mark.asyncio
async def test_delete_user_by_super_admin(client, test_super_admin: User, test_company_admin: User):
    response = await client.delete(
        f"/api/v1/users/{test_company_admin.id}",
        headers=auth_header(test_super_admin),
    )
    assert response.status_code in (200, 204)


@pytest.mark.asyncio
async def test_delete_user_by_company_admin_forbidden(client, test_company_admin: User, test_accountant: User):
    response = await client.delete(
        f"/api/v1/users/{test_accountant.id}",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 403
