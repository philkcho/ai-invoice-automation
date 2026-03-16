from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_user, require_approver_up, require_accountant_up,
    ROLE_SUPER_ADMIN,
)
from app.utils.company_access import verify_company_access
from app.schemas.approval import (
    ApprovalActionRequest, InvoiceResubmitRequest,
    ApprovalResponse, ApprovalDetailResponse,
    ApprovalListResponse, ApprovalHistoryResponse,
)
from app.services import approval_service
from app.services.invoice_service import get_invoice

router = APIRouter()


@router.get("", response_model=ApprovalListResponse)
async def list_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver_up),
):
    """승인 목록 조회 (내 역할에 해당하는 항목)"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]

    # APPROVER는 자기 역할 필터링, COMPANY_ADMIN/SUPER_ADMIN은 전체
    approver_role = None
    if current_user["role"] == "APPROVER":
        approver_role = "APPROVER"

    items, total = await approval_service.list_pending_approvals(
        db, company_id, approver_role, status_filter, skip, limit
    )
    return ApprovalListResponse(items=items, total=total)


@router.post("/{approval_id}/action", response_model=ApprovalResponse)
async def process_approval(
    approval_id: UUID,
    data: ApprovalActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_approver_up),
):
    """승인/거절 처리"""
    return await approval_service.process_approval_action(
        db,
        approval_id=approval_id,
        user_id=current_user["user_id"],
        user_role=current_user["role"],
        company_id=current_user.get("company_id"),
        action=data.action,
        comments=data.comments,
        rejection_reason=data.rejection_reason,
    )


@router.get("/invoice/{invoice_id}/history", response_model=ApprovalHistoryResponse)
async def get_invoice_approval_history(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """인보이스 승인 이력 조회"""
    invoice = await get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
    items = await approval_service.get_approval_history(db, invoice_id)
    return ApprovalHistoryResponse(items=items, total=len(items))


@router.post("/invoice/{invoice_id}/resubmit", response_model=dict)
async def resubmit_invoice(
    invoice_id: UUID,
    data: InvoiceResubmitRequest = InvoiceResubmitRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """거절된 인보이스 재제출"""
    invoice = await get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
    invoice = await approval_service.resubmit_invoice(db, invoice_id, data.notes)
    return {
        "invoice_id": str(invoice.id),
        "status": invoice.status,
        "submission_round": invoice.submission_round,
        "message": "Invoice resubmitted successfully",
    }
