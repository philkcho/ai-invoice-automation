import pytest
from uuid import uuid4
from app.models.user import User
from app.models.invoice import Invoice
from app.models.invoice_approval import InvoiceApproval
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_list_approvals(client, test_company_admin: User):
    response = await client.get(
        "/api/v1/approvals",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_list_approvals_by_viewer_forbidden(client, test_viewer: User):
    response = await client.get(
        "/api/v1/approvals",
        headers=auth_header(test_viewer),
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_approval_action_approve(
    client, test_company_admin: User, test_invoice: Invoice, test_company, db_session
):
    # 인보이스를 IN_APPROVAL 상태로 설정
    test_invoice.status = "IN_APPROVAL"
    await db_session.flush()

    # 승인 레코드 생성
    approval = InvoiceApproval(
        id=uuid4(),
        company_id=test_company.id,
        invoice_id=test_invoice.id,
        step=1,
        approver_role="COMPANY_ADMIN",
        approver_id=test_company_admin.id,
        status="PENDING",
    )
    db_session.add(approval)
    await db_session.flush()

    response = await client.post(
        f"/api/v1/approvals/{approval.id}/action",
        json={
            "action": "APPROVED",
            "comments": "Looks good",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_approval_action_reject(
    client, test_company_admin: User, test_invoice: Invoice, test_company, db_session
):
    test_invoice.status = "IN_APPROVAL"
    await db_session.flush()

    approval = InvoiceApproval(
        id=uuid4(),
        company_id=test_company.id,
        invoice_id=test_invoice.id,
        step=1,
        approver_role="COMPANY_ADMIN",
        approver_id=test_company_admin.id,
        status="PENDING",
    )
    db_session.add(approval)
    await db_session.flush()

    response = await client.post(
        f"/api/v1/approvals/{approval.id}/action",
        json={
            "action": "REJECTED",
            "rejection_reason": "Missing documentation",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_approval_history(client, test_company_admin: User, test_invoice: Invoice):
    response = await client.get(
        f"/api/v1/approvals/invoice/{test_invoice.id}/history",
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_approval_action_not_found(client, test_company_admin: User):
    response = await client.post(
        f"/api/v1/approvals/{uuid4()}/action",
        json={
            "action": "APPROVED",
            "comments": "Test",
        },
        headers=auth_header(test_company_admin),
    )
    assert response.status_code in (404, 400, 403)


@pytest.mark.asyncio
async def test_unauthenticated_approval_access(client):
    response = await client.get("/api/v1/approvals")
    assert response.status_code == 403
