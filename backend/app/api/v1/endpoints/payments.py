from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    get_current_user, require_accountant_up, require_admin,
    ROLE_SUPER_ADMIN,
)
from app.utils.company_access import verify_company_access
from app.schemas.payment import (
    PaymentScheduleRequest, PaymentProcessRequest,
    PaymentCompleteRequest, PaymentVoidRequest,
    PaymentResponse, PaymentDetailResponse, PaymentListResponse,
    AwaitingPaymentListResponse,
)
from app.services import payment_service

router = APIRouter()


@router.post("", response_model=PaymentResponse, status_code=201)
async def schedule_payment(
    data: PaymentScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """결제 스케줄 등록"""
    from app.services.invoice_service import get_invoice
    invoice = await get_invoice(db, data.invoice_id)
    verify_company_access(current_user, invoice.company_id)

    return await payment_service.schedule_payment(
        db,
        invoice_id=data.invoice_id,
        payment_method=data.payment_method,
        scheduled_date=data.scheduled_date,
        amount_paid=data.amount_paid,
        bank_name=data.bank_name,
        notes=data.notes,
        created_by=current_user["user_id"],
    )


@router.get("", response_model=PaymentListResponse)
async def list_payments(
    invoice_id: Optional[UUID] = None,
    payment_status: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """결제 목록 조회"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await payment_service.list_payments(
        db, company_id, invoice_id, payment_status, skip, limit
    )
    return PaymentListResponse(items=items, total=total)


@router.get("/awaiting", response_model=AwaitingPaymentListResponse)
async def list_awaiting_payment(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """결제 대기 중인 승인 완료 인보이스 목록"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await payment_service.list_awaiting_payment(db, company_id, skip, limit)
    return AwaitingPaymentListResponse(items=items, total=total)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """결제 상세 조회"""
    payment = await payment_service.get_payment(db, payment_id)
    verify_company_access(current_user, payment.company_id)
    return payment


@router.post("/{payment_id}/process", response_model=PaymentResponse)
async def process_payment(
    payment_id: UUID,
    data: PaymentProcessRequest = PaymentProcessRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """결제 처리 시작 (SCHEDULED → PROCESSING)"""
    payment = await payment_service.get_payment(db, payment_id)
    verify_company_access(current_user, payment.company_id)
    return await payment_service.process_payment(db, payment_id, data.transaction_ref)


@router.post("/{payment_id}/complete", response_model=PaymentResponse)
async def complete_payment(
    payment_id: UUID,
    data: PaymentCompleteRequest = PaymentCompleteRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """결제 완료 (→ PAID)"""
    payment = await payment_service.get_payment(db, payment_id)
    verify_company_access(current_user, payment.company_id)
    return await payment_service.complete_payment(
        db, payment_id, data.paid_date, data.transaction_ref
    )


@router.post("/{payment_id}/fail", response_model=PaymentResponse)
async def fail_payment(
    payment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """결제 실패 처리 (PROCESSING → FAILED)"""
    payment = await payment_service.get_payment(db, payment_id)
    verify_company_access(current_user, payment.company_id)
    return await payment_service.fail_payment(db, payment_id)


@router.post("/{payment_id}/void", response_model=PaymentResponse)
async def void_payment(
    payment_id: UUID,
    data: PaymentVoidRequest = PaymentVoidRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """결제 무효화 (→ VOID)"""
    payment = await payment_service.get_payment(db, payment_id)
    verify_company_access(current_user, payment.company_id)
    return await payment_service.void_payment(db, payment_id, data.notes)
