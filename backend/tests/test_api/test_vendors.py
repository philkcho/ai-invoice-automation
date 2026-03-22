import pytest
from app.models.user import User
from app.models.vendor import Vendor
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_create_vendor(client, test_company_admin: User, test_company):
    response = await client.post(
        "/api/v1/vendors",
        json={
            "company_id": str(test_company.id),
            "vendor_code": "NEW01",
            "company_name": "New Vendor LLC",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_vendor_by_viewer_forbidden(client, test_viewer: User, test_company):
    response = await client.post(
        "/api/v1/vendors",
        json={
            "company_id": str(test_company.id),
            "vendor_code": "NOPE01",
            "company_name": "Not Allowed",
        },
        headers=auth_header(test_viewer),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_vendors(client, test_company_admin: User, test_vendor: Vendor):
    response = await client.get(
        "/api/v1/vendors",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_vendor_by_id(client, test_company_admin: User, test_vendor: Vendor):
    response = await client.get(
        f"/api/v1/vendors/{test_vendor.id}",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    assert response.json()["vendor_code"] == "VEND01"


@pytest.mark.asyncio
async def test_update_vendor(client, test_company_admin: User, test_vendor: Vendor):
    response = await client.patch(
        f"/api/v1/vendors/{test_vendor.id}",
        json={"company_name": "Updated Vendor"},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    assert response.json()["company_name"] == "Updated Vendor"


@pytest.mark.asyncio
async def test_delete_vendor(client, test_super_admin: User, test_vendor: Vendor):
    response = await client.delete(
        f"/api/v1/vendors/{test_vendor.id}",
        headers=auth_header(test_super_admin),
    )
    assert response.status_code in (200, 204)


@pytest.mark.asyncio
async def test_create_shared_vendor_by_super_admin(client, test_super_admin: User):
    response = await client.post(
        "/api/v1/vendors",
        json={
            "vendor_code": "SHARED01",
            "company_name": "Shared Vendor",
        },
        headers=auth_header(test_super_admin),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_unauthenticated_vendor_access(client):
    response = await client.get("/api/v1/vendors")
    assert response.status_code == 403
