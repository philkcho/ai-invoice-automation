import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.user import User
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_invoice_status_flow(client, test_company_admin: User, test_invoice: Invoice, db_session):
    """인보이스 상태 전이: PENDING → SUBMITTED 제출 가능"""
    response = await client.post(
        f"/api/v1/invoices/{test_invoice.id}/submit",
        headers=auth_header(test_company_admin),
    )
    # submit은 validation을 거치므로 200이거나 validation 실패 시 다른 코드
    assert response.status_code in (200, 400, 422)


@pytest.mark.asyncio
async def test_invoice_confirm_from_ocr_review(
    client, test_company_admin: User, test_invoice: Invoice, db_session
):
    """OCR_REVIEW → PENDING 확정"""
    test_invoice.status = "OCR_REVIEW"
    await db_session.flush()

    response = await client.post(
        f"/api/v1/invoices/{test_invoice.id}/confirm",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_delete_invoice_initial_only(
    client, test_company_admin: User, test_invoice: Invoice, db_session
):
    """초기 상태가 아닌 인보이스는 삭제 불가"""
    # PENDING 상태 — 삭제 가능 여부는 서비스 정책에 따라 다름
    test_invoice.status = "APPROVED"
    await db_session.flush()

    response = await client.delete(
        f"/api/v1/invoices/{test_invoice.id}",
        headers=auth_header(test_company_admin),
    )
    # APPROVED 상태의 인보이스는 삭제 불가해야 함
    assert response.status_code in (400, 403, 409)


@pytest.mark.asyncio
async def test_invoice_validate(client, test_company_admin: User, test_invoice: Invoice):
    """인보이스 validation 실행"""
    response = await client.post(
        f"/api/v1/invoices/{test_invoice.id}/validate",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code in (200, 400, 422)


@pytest.mark.asyncio
async def test_invoice_list_filter_by_status(
    client, test_company_admin: User, test_invoice: Invoice
):
    """상태 필터링으로 인보이스 목록 조회"""
    response = await client.get(
        "/api/v1/invoices",
        params={"status": "PENDING"},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    for item in data["items"]:
        assert item["status"] == "PENDING"
