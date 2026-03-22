import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, update, cast, String, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.invoice import Invoice
from app.models.invoice_approval import InvoiceApproval
from app.models.user import User
from app.services.approval_settings_service import lookup_approval_steps
from app.services import notification_service

logger = logging.getLogger(__name__)

# 기본 폴백: 승인 설정이 없을 때 COMPANY_ADMIN 1단계
DEFAULT_APPROVER_ROLE = "COMPANY_ADMIN"


async def _find_fallback_admin(db: AsyncSession, company_id: UUID) -> UUID | None:
    """폴백: 회사의 활성 COMPANY_ADMIN 첫 사용자 ID 반환"""
    result = await db.execute(
        select(User.id).where(
            User.company_id == company_id,
            User.role == "COMPANY_ADMIN",
            User.is_active.is_(True),
        ).order_by(User.created_at.asc()).limit(1)
    )
    return result.scalar_one_or_none()


async def start_approval_workflow(
    db: AsyncSession, invoice: Invoice
) -> list[InvoiceApproval]:
    """인보이스 승인 워크플로우 시작

    1. approval_settings 조회
    2. 매칭 없으면 기본 1단계 COMPANY_ADMIN
    3. invoice_approvals 레코드 생성 (approver_id 미리 지정)
    4. 첫 번째 단계 승인자에게 알림 발송
    """
    steps = await lookup_approval_steps(
        db, invoice.company_id, invoice.invoice_type_id, float(invoice.amount_total)
    )

    if not steps:
        # 기본 폴백: 1단계 COMPANY_ADMIN, 첫 COMPANY_ADMIN 사용자 지정
        fallback_admin_id = await _find_fallback_admin(db, invoice.company_id)
        if not fallback_admin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active COMPANY_ADMIN found. Configure approval settings first.",
            )
        step_configs = [{
            "step": 1,
            "role": DEFAULT_APPROVER_ROLE,
            "approver_id": fallback_admin_id,
        }]
    else:
        step_configs = [
            {
                "step": s.step,
                "role": s.step_approver_role or DEFAULT_APPROVER_ROLE,
                "approver_id": s.approver_user_id,
            }
            for s in steps
        ]

    approvals = []
    for cfg in step_configs:
        approval = InvoiceApproval(
            company_id=invoice.company_id,
            invoice_id=invoice.id,
            submission_round=invoice.submission_round,
            step=cfg["step"],
            approver_role=cfg["role"],
            approver_id=cfg["approver_id"],
            status="PENDING",
        )
        db.add(approval)
        approvals.append(approval)

    # 인보이스 상태 → IN_APPROVAL
    invoice.status = "IN_APPROVAL"
    await db.flush()
    for a in approvals:
        await db.refresh(a)

    # 첫 번째 단계: 특정 사용자 지정 시 개인 알림, 아니면 역할 알림
    first_cfg = step_configs[0]
    if first_cfg["approver_id"]:
        await notification_service.create_notification(
            db,
            company_id=invoice.company_id,
            user_id=first_cfg["approver_id"],
            type="APPROVAL_REQUEST",
            title=f"Approval request: Invoice #{invoice.invoice_number or invoice.id}",
            message=f"Invoice amount ${float(invoice.amount_total):,.2f} — your approval is required.",
            entity_type="invoice",
            entity_id=invoice.id,
        )
    else:
        await notification_service.create_role_notifications(
            db,
            company_id=invoice.company_id,
            role=first_cfg["role"],
            type="APPROVAL_REQUEST",
            title=f"Approval request: Invoice #{invoice.invoice_number or invoice.id}",
            message=f"Invoice amount ${float(invoice.amount_total):,.2f} — approval is required.",
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
    company_id: UUID | None = None,
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

    # 회사 격리 검증
    if user_role != "SUPER_ADMIN" and company_id and approval.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if approval.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval already processed: {approval.status}",
        )

    # 권한 검증: 특정 사용자 지정된 경우 해당 사용자만, 아니면 역할 검증
    # SUPER_ADMIN은 모든 단계 처리 가능
    if user_role != "SUPER_ADMIN":
        if approval.approver_id:
            # 특정 사용자 지정: 해당 사용자만 처리 가능
            if user_id != approval.approver_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This step is assigned to a specific approver",
                )
        else:
            # 역할 기반 폴백: 기존 로직
            if user_role != approval.approver_role:
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
            InvoiceApproval.status.cast(String) == "PENDING",
            InvoiceApproval.step > approval.step,
        ).order_by(InvoiceApproval.step.asc()).limit(1)
    )
    next_step = result.scalar_one_or_none()

    if next_step:
        # 다음 단계: 특정 사용자 지정 시 개인 알림, 아니면 역할 알림
        if next_step.approver_id:
            await notification_service.create_notification(
                db,
                company_id=invoice.company_id,
                user_id=next_step.approver_id,
                type="APPROVAL_REQUEST",
                title=f"Approval request (Step {next_step.step}): Invoice #{invoice.invoice_number or invoice.id}",
                message=f"Previous step approved. Your approval is required.",
                entity_type="invoice",
                entity_id=invoice.id,
            )
        else:
            await notification_service.create_role_notifications(
                db,
                company_id=invoice.company_id,
                role=next_step.approver_role,
                type="APPROVAL_REQUEST",
                title=f"Approval request (Step {next_step.step}): Invoice #{invoice.invoice_number or invoice.id}",
                message=f"Previous step approved. Next approval is required.",
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
                title=f"Invoice approved: #{invoice.invoice_number or invoice.id}",
                message=f"Invoice has been fully approved. You can now schedule payment.",
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
            InvoiceApproval.status.cast(String) == "PENDING",
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
            title=f"Invoice rejected: #{invoice.invoice_number or invoice.id}",
            message=f"Reason: {rejection_reason or '(No reason provided)'}",
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

    # 이전 라운드에서 아직 PENDING인 승인 기록만 CANCELLED로 변경
    # APPROVED/REJECTED 기록은 감사 추적을 위해 보존
    await db.execute(
        update(InvoiceApproval)
        .where(
            InvoiceApproval.invoice_id == invoice.id,
            InvoiceApproval.submission_round == invoice.submission_round,
            InvoiceApproval.status.cast(String) == "PENDING",
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
    approver_user_id: Optional[UUID] = None,
    approver_role: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """승인 대기/처리 목록 조회 (인보이스 요약 포함)

    approver_user_id가 지정되면: 해당 사용자에게 지정된 건 + 역할 기반 미지정 건
    """
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

    if approver_user_id:
        # 사용자 지정 건 OR (approver_id가 NULL이고 역할 매칭)
        if approver_role:
            user_filter = or_(
                InvoiceApproval.approver_id == approver_user_id,
                (InvoiceApproval.approver_id.is_(None))
                & (InvoiceApproval.approver_role.cast(String) == approver_role),
            )
        else:
            user_filter = InvoiceApproval.approver_id == approver_user_id
        query = query.where(user_filter)
        count_query = count_query.where(user_filter)
    elif approver_role:
        query = query.where(InvoiceApproval.approver_role.cast(String) == approver_role)
        count_query = count_query.where(InvoiceApproval.approver_role.cast(String) == approver_role)

    if status_filter:
        query = query.where(InvoiceApproval.status.cast(String) == status_filter)
        count_query = count_query.where(InvoiceApproval.status.cast(String) == status_filter)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(InvoiceApproval.created_at.desc()).offset(skip).limit(limit)
    )

    items = []
    for approval, invoice in result.all():
        vendor_name = invoice.vendor.company_name if invoice.vendor else None
        approver_name = None
        if approval.approver:
            approver_name = approval.approver.full_name
        items.append({
            "id": approval.id,
            "company_id": approval.company_id,
            "invoice_id": approval.invoice_id,
            "submission_round": approval.submission_round,
            "step": approval.step,
            "approver_role": approval.approver_role,
            "approver_id": approval.approver_id,
            "approver_name": approver_name,
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
