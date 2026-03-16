import pytest
from app.models.user import User
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_create_company(client, test_super_admin: User):
    response = await client.post(
        "/api/v1/companies",
        json={
            "company_code": "NEW01",
            "company_name": "New Company",
        },
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company_code"] == "NEW01"
    assert data["company_name"] == "New Company"
    assert data["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_create_company_duplicate_code(client, test_super_admin: User, test_company):
    response = await client.post(
        "/api/v1/companies",
        json={
            "company_code": "TEST01",
            "company_name": "Duplicate Company",
        },
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_list_companies(client, test_super_admin: User, test_company):
    response = await client.get(
        "/api/v1/companies",
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_company(client, test_super_admin: User, test_company):
    response = await client.get(
        f"/api/v1/companies/{test_company.id}",
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 200
    assert response.json()["company_code"] == "TEST01"


@pytest.mark.asyncio
async def test_update_company(client, test_super_admin: User, test_company):
    response = await client.patch(
        f"/api/v1/companies/{test_company.id}",
        json={"company_name": "Updated Company"},
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 200
    assert response.json()["company_name"] == "Updated Company"


@pytest.mark.asyncio
async def test_company_admin_cannot_create(client, test_company_admin: User):
    response = await client.post(
        "/api/v1/companies",
        json={
            "company_code": "NOPE01",
            "company_name": "Not Allowed",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_access(client):
    response = await client.get("/api/v1/companies")
    assert response.status_code == 403
