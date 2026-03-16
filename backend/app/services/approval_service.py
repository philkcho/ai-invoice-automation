import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.invoice import Invoice
from app.models.invoice_approval import InvoiceApproval
from app.services.approval_settings_service import lookup_approval_steps
from app.services import notification_service

logger = logging.getLogger(__name__)

# 기본 폴백: 승인 설정이 없을 때 COMPANY_ADMIN 1단계
DEFAULT_APPROVER_ROLE = "COMPANY_ADMIN"


async def start_approval_workflow(
    db: AsyncSession, invoice: Invoice
) -> list[InvoiceApproval]:
    """인보이스 승인 워크플로우 시작

    1. approval_settings 조회
    2. 매칭 없으면 기본 1단계 COMPANY_ADMIN
    3. invoice_approvals 레코드 생성
    4. 첫 번째 단계 역할에 알림 발송
    """
    steps = await lookup_approval_steps(
        db, invoice.company_id, invoice.invoice_type_id, float(invoice.amount_total)
    )

    if not steps:
        # 기본 폴백: 1단계 COMPANY_ADMIN
        step_configs = [{"step": 1, "role": DEFAULT_APPROVER_ROLE}]
    else:
        step_configs = [
            {"step": s.step, "role": s.step_approver_role} for s in steps
        ]

    approvals = []
    for cfg in step_configs:
        approval = InvoiceApproval(
            company_id=invoice.company_id,
            invoice_id=invoice.id,
            submission_round=invoice.submission_round,
            step=cfg["step"],
            approver_role=cfg["role"],
            status="PENDING",
        )
        db.add(approval)
        approvals.append(approval)

    # 인보이스 상태 → IN_APPROVAL
    invoice.status = "IN_APPROVAL"
    await db.flush()
    for a in approvals:
        await db.refresh(a)

    # 첫 번째 단계 역할에게 알림
    first_role = step_configs[0]["role"]
    await notification_service.create_role_notifications(
        db,
        company_id=invoice.company_id,
        role=first_role,
        type="APPROVAL_REQUEST",
        title=f"승인 요청: Invoice #{invoice.invoice_number or invoice.id}",
        message=f"인보이스 금액 ${float(invoice.amount_total):,.2f} — 승인이 필요합니다.",
        entity_type="invoice",
        entity_id=invoice.id,
    )

    logger.info(
        "Approval workflow started: invoice=%s round=%d steps=%d",
        invoice.id, invoice.submission_round, len(approvals),
    )
    return approvals


async def process_approval_action(
    db: AsyncSession,
    approval_id: UUID,
    user_id: UUID,
    user_role: str,
    action: str,
    comments: Optional[str] = None,
    rejection_reason: Optional[str] = None,
) -> InvoiceApproval:
    """승인/거절 액션 처리"""
    result = await db.execute(
        select(InvoiceApproval).where(InvoiceApproval.id == approval_id)
    )
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    if approval.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval already processed: {approval.status}",
        )

    # 역할 검증: 해당 단계의 역할과 사용자 역할 일치 확인
    # SUPER_ADMIN은 모든 단계 처리 가능
    if user_role != "SUPER_ADMIN" and user_role != approval.approver_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This step requires role: {approval.approver_role}",
        )

    # 인보이스 조회
    inv_result = await db.execute(
        select(Invoice).where(Invoice.id == approval.invoice_id)
    )
    invoice = inv_result.scalar_one()

    if invoice.status != "IN_APPROVAL":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoice is not in approval state: {invoice.status}",
        )

    # 액션 기록
    approval.approver_id = user_id
    approval.status = action
    approval.action_at = datetime.now(timezone.utc)
    approval.comments = comments
    if action == "REJECTED":
        approval.rejection_reason = rejection_reason

    await db.flush()

    if action == "APPROVED":
        await _handle_approved(db, approval, invoice)
    else:
        await _handle_rejected(db, approval, invoice, rejection_reason)

    await db.refresh(approval)
    return approval


async def _handle_approved(
    db: AsyncSession, approval: InvoiceApproval, invoice: Invoice
) -> None:
    """승인 처리: 다음 단계가 있으면 알림, 없으면 최종 승인"""
    # 현재 라운드의 다음 PENDING 단계 확인
    result = await db.execute(
        select(InvoiceApproval).where(
            InvoiceApproval.invoice_id == invoice.id,
            InvoiceApproval.submission_round == invoice.submission_round,
            InvoiceApproval.status == "PENDING",
            InvoiceApproval.step > approval.step,
        ).order_by(InvoiceApproval.step.asc()).limit(1)
    )
    next_step = result.scalar_one_or_none()

    if next_step:
        # 다음 단계 승인자에게 알림
        await notification_service.create_role_notifications(
            db,
            company_id=invoice.company_id,
            role=next_step.approver_role,
            type="APPROVAL_REQUEST",
            title=f"승인 요청 (Step {next_step.step}): Invoice #{invoice.invoice_number or invoice.id}",
            message=f"이전 단계 승인 완료. 다음 승인이 필요합니다.",
            entity_type="invoice",
            entity_id=invoice.id,
        )
    else:
        # 모든 단계 승인 완료 → APPROVED
        invoice.status = "APPROVED"
        await db.flush()

        # 제출자(생성자)에게 승인 알림
        if invoice.created_by:
            await notification_service.create_notification(
                db,
                company_id=invoice.company_id,
                user_id=invoice.created_by,
                type="INVOICE_APPROVED",
                title=f"인보이스 승인 완료: #{invoice.invoice_number or invoice.id}",
                message=f"인보이스가 최종 승인되었습니다. 결제를 스케줄링할 수 있습니다.",
                entity_type="invoice",
                entity_id=invoice.id,
            )

        logger.info("Invoice %s fully approved", invoice.id)


async def _handle_rejected(
    db: AsyncSession,
    approval: InvoiceApproval,
    invoice: Invoice,
    rejection_reason: Optional[str],
) -> None:
    """거절 처리: 나머지 PENDING 단계 → CANCELLED, 인보이스 → REJECTED"""
    # 남은 PENDING 단계 취소
    await db.execute(
        update(InvoiceApproval)
        .where(
            InvoiceApproval.invoice_id == invoice.id,
            InvoiceApproval.submission_round == invoice.submission_round,
            InvoiceApproval.status == "PENDING",
        )
        .values(status="CANCELLED")
    )

    invoice.status = "REJECTED"
    invoice.rejection_reason = rejection_reason
    await db.flush()

    # 제출자(생성자)에게 거절 알림
    if invoice.created_by:
        await notification_service.create_notification(
            db,
            company_id=invoice.company_id,
            user_id=invoice.created_by,
            type="INVOICE_REJECTED",
            title=f"인보이스 거절: #{invoice.invoice_number or invoice.id}",
            message=f"사유: {rejection_reason or '(사유 없음)'}",
            entity_type="invoice",
            entity_id=invoice.id,
        )

    logger.info("Invoice %s rejected at step %d", invoice.id, approval.step)


async def resubmit_invoice(
    db: AsyncSession, invoice_id: UUID, notes: Optional[str] = None
) -> Invoice:
    """거절된 인보이스 재제출"""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if invoice.status != "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only rejected invoices can be resubmitted (current: {invoice.status})",
        )

    # 이전 라운드 승인 기록 → CANCELLED
    await db.execute(
        update(InvoiceApproval)
        .where(
            InvoiceApproval.invoice_id == invoice.id,
            InvoiceApproval.submission_round == invoice.submission_round,
        )
        .values(status="CANCELLED")
    )

    # 새 라운드
    invoice.submission_round += 1
    invoice.status = "PENDING"
    invoice.rejection_reason = None
    if notes:
        invoice.notes = notes
    await db.flush()
    await db.refresh(invoice)

    logger.info("Invoice %s resubmitted: round=%d", invoice.id, invoice.submission_round)
    return invoice


async def list_pending_approvals(
    db: AsyncSession,
    company_id: Optional[UUID] = None,
    approver_role: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """승인 대기/처리 목록 조회 (인보이스 요약 포함)"""
    query = (
        select(InvoiceApproval, Invoice)
        .join(Invoice, InvoiceApproval.invoice_id == Invoice.id)
    )
    count_query = (
        select(func.count())
        .select_from(InvoiceApproval)
        .join(Invoice, InvoiceApproval.invoice_id == Invoice.id)
    )

    if company_id:
        query = query.where(InvoiceApproval.company_id == company_id)
        count_query = count_query.where(InvoiceApproval.company_id == company_id)

    if approver_role:
        query = query.where(InvoiceApproval.approver_role == approver_role)
        count_query = count_query.where(InvoiceApproval.approver_role == approver_role)

    if status_filter:
        query = query.where(InvoiceApproval.status == status_filter)
        count_query = count_query.where(InvoiceApproval.status == status_filter)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(InvoiceApproval.created_at.desc()).offset(skip).limit(limit)
    )

    items = []
    for approval, invoice in result.all():
        vendor_name = invoice.vendor.name if invoice.vendor else None
        items.append({
            "id": approval.id,
            "company_id": approval.company_id,
            "invoice_id": approval.invoice_id,
            "submission_round": approval.submission_round,
            "step": approval.step,
            "approver_role": approval.approver_role,
            "approver_id": approval.approver_id,
            "status": approval.status,
            "action_at": approval.action_at,
            "comments": approval.comments,
            "rejection_reason": approval.rejection_reason,
            "created_at": approval.created_at,
            "invoice_number": invoice.invoice_number,
            "vendor_name": vendor_name,
            "amount_total": float(invoice.amount_total),
            "invoice_status": invoice.status,
        })

    return items, total


async def get_approval_history(
    db: AsyncSession, invoice_id: UUID
) -> list[InvoiceApproval]:
    """인보이스의 전체 승인 이력 조회"""
    result = await db.execute(
        select(InvoiceApproval)
        .where(InvoiceApproval.invoice_id == invoice_id)
        .order_by(
            InvoiceApproval.submission_round.asc(),
            InvoiceApproval.step.asc(),
        )
    )
    return list(result.scalars().all())
