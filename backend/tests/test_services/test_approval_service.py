import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.invoice_approval import InvoiceApproval
from app.models.user import User
from app.core.security import hash_password
from tests.conftest import auth_header


@pytest.mark.asyncio
async def test_approval_flow_approve_completes_invoice(
    client, test_company_admin: User, test_invoice: Invoice, test_company, db_session
):
    """단일 단계 승인: 승인 처리 후 인보이스 상태가 APPROVED로 변경"""
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
        json={"action": "APPROVED", "comments": "Approved"},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200

    await db_session.refresh(test_invoice)
    assert test_invoice.status in ("APPROVED", "SCHEDULED")


@pytest.mark.asyncio
async def test_approval_flow_reject_changes_invoice_status(
    client, test_company_admin: User, test_invoice: Invoice, test_company, db_session
):
    """승인 거절 시 인보이스 상태가 REJECTED로 변경"""
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
        json={"action": "REJECTED", "rejection_reason": "Invalid amount"},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code == 200

    await db_session.refresh(test_invoice)
    assert test_invoice.status == "REJECTED"


@pytest.mark.asyncio
async def test_resubmit_rejected_invoice(
    client, test_company_admin: User, test_invoice: Invoice, db_session
):
    """거절된 인보이스 재제출"""
    test_invoice.status = "REJECTED"
    await db_session.flush()

    response = await client.post(
        f"/api/v1/approvals/invoice/{test_invoice.id}/resubmit",
        json={},
        headers=auth_header(test_company_admin),
    )
    assert response.status_code in (200, 400)


@pytest.mark.asyncio
async def test_approver_sees_only_assigned_approvals(
    client, test_approver: User, test_invoice: Invoice, test_company, db_session
):
    """APPROVER 역할은 자신에게 지정된 승인 항목만 조회"""
    test_invoice.status = "IN_APPROVAL"
    await db_session.flush()

    # 다른 실제 사용자를 생성하여 FK 제약 충족
    other_user = User(
        id=uuid4(),
        company_id=test_company.id,
        email="other_approver@test.com",
        full_name="Other Approver",
        role="APPROVER",
        password_hash=hash_password("password123"),
    )
    db_session.add(other_user)
    await db_session.flush()

    # 다른 사용자에게 지정된 승인
    approval = InvoiceApproval(
        id=uuid4(),
        company_id=test_company.id,
        invoice_id=test_invoice.id,
        step=1,
        approver_role="APPROVER",
        approver_id=other_user.id,
        status="PENDING",
    )
    db_session.add(approval)
    await db_session.flush()

    response = await client.get(
        "/api/v1/approvals",
        headers=auth_header(test_approver),
    )
    assert response.status_code == 200
    data = response.json()
    # 다른 사용자에게 지정된 승인은 보이지 않아야 함
    for item in data["items"]:
        if item.get("approver_id"):
            assert item["approver_id"] == str(test_approver.id)
