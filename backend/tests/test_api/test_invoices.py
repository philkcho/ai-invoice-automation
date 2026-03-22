import pytest
from app.models.user import User
from app.models.invoice import Invoice
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_create_invoice(client, test_company_admin: User, test_company, test_vendor, test_invoice_type):
    response = await client.post(
        "/api/v1/invoices",
        json={
            "company_id": str(test_company.id),
            "vendor_id": str(test_vendor.id),
            "invoice_type_id": str(test_invoice_type.id),
            "invoice_number": "INV-NEW-001",
            "currency_original": "USD",
            "source_channel": "MANUAL",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["invoice_number"] == "INV-NEW-001"
    assert data["status"] in ("RECEIVED", "PENDING")


@pytest.mark.asyncio
async def test_create_invoice_by_accountant(client, test_accountant: User, test_company, test_vendor, test_invoice_type):
    response = await client.post(
        "/api/v1/invoices",
        json={
            "company_id": str(test_company.id),
            "vendor_id": str(test_vendor.id),
            "invoice_type_id": str(test_invoice_type.id),
            "invoice_number": "INV-ACC-001",
            "currency_original": "USD",
            "source_channel": "MANUAL",
        },
        headers=auth_header(test_accountant),
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_invoice_by_viewer_forbidden(client, test_viewer: User, test_company, test_vendor, test_invoice_type):
    response = await client.post(
        "/api/v1/invoices",
        json={
            "company_id": str(test_company.id),
            "vendor_id": str(test_vendor.id),
            "invoice_type_id": str(test_invoice_type.id),
            "invoice_number": "INV-NOPE",
            "currency_original": "USD",
            "source_channel": "MANUAL",
        },
        headers=auth_header(test_viewer),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_invoices(client, test_company_admin: User, test_invoice: Invoice):
    response = await client.get(
        "/api/v1/invoices",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_invoice_by_id(client, test_company_admin: User, test_invoice: Invoice):
    response = await client.get(
        f"/api/v1/invoices/{test_invoice.id}",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["invoice_number"] == "INV-001"
    assert data["amount_total"] == 1100.0


@pytest.mark.asyncio
async def test_get_invoice_not_found(client, test_company_admin: User):
    from uuid import uuid4
    response = await client.get(
        f"/api/v1/invoices/{uuid4()}",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_invoice(client, test_company_admin: User, test_invoice: Invoice):
    response = await client.patch(
        f"/api/v1/invoices/{test_invoice.id}",
        json={"notes": "Updated note"},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_check_duplicate_invoice(client, test_company_admin: User, test_invoice: Invoice):
    response = await client.get(
        "/api/v1/invoices/check-duplicate",
        params={"invoice_number": "INV-001"},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_unauthenticated_invoice_access(client):
    response = await client.get("/api/v1/invoices")
    assert response.status_code == 403
