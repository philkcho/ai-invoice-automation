import pytest
from datetime import date
from uuid import uuid4
from app.models.user import User
from app.models.invoice import Invoice
from app.models.invoice_payment import InvoicePayment
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_schedule_payment(client, test_company_admin: User, test_invoice: Invoice, db_session):
    # 결제 스케줄을 등록하려면 인보이스가 APPROVED 상태여야 함
    test_invoice.status = "APPROVED"
    await db_session.flush()

    response = await client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(test_invoice.id),
            "payment_method": "ACH",
            "scheduled_date": str(date.today()),
            "amount_paid": 1100.00,
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code in (200, 201)


@pytest.mark.asyncio
async def test_list_payments(client, test_company_admin: User, test_invoice):
    response = await client.get(
        "/api/v1/payments",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_list_awaiting_payments(client, test_company_admin: User):
    response = await client.get(
        "/api/v1/payments/awaiting",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_payment_not_found(client, test_company_admin: User):
    response = await client.get(
        f"/api/v1/payments/{uuid4()}",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_schedule_payment_by_viewer_forbidden(client, test_viewer: User, test_invoice: Invoice, db_session):
    test_invoice.status = "APPROVED"
    await db_session.flush()

    response = await client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(test_invoice.id),
            "payment_method": "WIRE",
            "scheduled_date": str(date.today()),
            "amount_paid": 500.00,
        },
        headers=auth_header(test_viewer),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_payment_access(client):
    response = await client.get("/api/v1/payments")
    assert response.status_code == 403
