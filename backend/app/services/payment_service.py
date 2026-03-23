import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.invoice import Invoice
from app.models.invoice_payment import InvoicePayment
from app.services import notification_service

logger = logging.getLogger(__name__)


async def schedule_payment(
    db: AsyncSession,
    invoice_id: UUID,
    payment_method: str,
    scheduled_date: date,
    amount_paid: float,
    bank_name: Optional[str],
    notes: Optional[str],
    created_by: UUID,
) -> InvoicePayment:
    """결제 스케줄 등록 (APPROVED 상태의 인보이스만)"""
    invoice = await _get_invoice(db, invoice_id)

    if invoice.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only schedule payment for APPROVED invoices (current: {invoice.status})",
        )

    payment = InvoicePayment(
        company_id=invoice.company_id,
        invoice_id=invoice.id,
        payment_method=payment_method,
        payment_status="SCHEDULED",
        scheduled_date=scheduled_date,
        amount_paid=amount_paid,
        bank_name=bank_name,
        notes=notes,
        created_by=created_by,
    )
    db.add(payment)

    # 인보이스 상태 → SCHEDULED
    invoice.status = "SCHEDULED"
    await db.flush()
    await db.refresh(payment)

    logger.info("Payment scheduled: invoice=%s method=%s date=%s", invoice_id, payment_method, scheduled_date)
    return payment


async def process_payment(
    db: AsyncSession,
    payment_id: UUID,
    transaction_ref: Optional[str] = None,
) -> InvoicePayment:
    """결제 처리 시작 (SCHEDULED → PROCESSING)
    ACH/WIRE 같은 비동기 결제 수단용
    """
    payment = await _get_payment(db, payment_id)

    if payment.payment_status != "SCHEDULED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment must be SCHEDULED to process (current: {payment.payment_status})",
        )

    payment.payment_status = "PROCESSING"
    if transaction_ref:
        payment.transaction_ref = transaction_ref
    await db.flush()
    await db.refresh(payment)

    logger.info("Payment processing: id=%s", payment_id)
    return payment


async def complete_payment(
    db: AsyncSession,
    payment_id: UUID,
    paid_date: Optional[date] = None,
    transaction_ref: Optional[str] = None,
) -> InvoicePayment:
    """결제 완료 처리 (SCHEDULED/PROCESSING → PAID)"""
    payment = await _get_payment(db, payment_id)

    if payment.payment_status not in ("SCHEDULED", "PROCESSING"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete payment with status: {payment.payment_status}",
        )

    payment.payment_status = "PAID"
    payment.paid_date = paid_date or date.today()
    if transaction_ref:
        payment.transaction_ref = transaction_ref

    # 인보이스 상태 → PAID
    inv_result = await db.execute(
        select(Invoice).where(Invoice.id == payment.invoice_id)
    )
    invoice = inv_result.scalar_one()
    invoice.status = "PAID"

    await db.flush()
    await db.refresh(payment)

    logger.info("Payment completed: id=%s invoice=%s", payment_id, payment.invoice_id)
    return payment


async def fail_payment(
    db: AsyncSession, payment_id: UUID, notes: Optional[str] = None
) -> InvoicePayment:
    """결제 실패 처리 (PROCESSING → FAILED)"""
    payment = await _get_payment(db, payment_id)

    if payment.payment_status != "PROCESSING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PROCESSING payments can fail (current: {payment.payment_status})",
        )

    payment.payment_status = "FAILED"
    if notes:
        payment.notes = notes

    # 인보이스 상태 → APPROVED로 롤백 (재스케줄 가능)
    inv_result = await db.execute(
        select(Invoice).where(Invoice.id == payment.invoice_id)
    )
    invoice = inv_result.scalar_one()
    invoice.status = "APPROVED"

    await db.flush()
    await db.refresh(payment)

    # 생성자에게 실패 알림
    if invoice.created_by:
        await notification_service.create_notification(
            db,
            company_id=invoice.company_id,
            user_id=invoice.created_by,
            type="PAYMENT_DUE",
            title=f"결제 실패: Invoice #{invoice.invoice_number or invoice.id}",
            message=f"결제가 실패했습니다. 재스케줄이 필요합니다.",
            entity_type="invoice",
            entity_id=invoice.id,
        )

    logger.info("Payment failed: id=%s invoice=%s", payment_id, payment.invoice_id)
    return payment


async def void_payment(
    db: AsyncSession, payment_id: UUID, notes: Optional[str] = None
) -> InvoicePayment:
    """결제 무효화 (모든 상태 → VOID)"""
    payment = await _get_payment(db, payment_id)

    if payment.payment_status == "VOID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment is already voided",
        )

    prev_status = payment.payment_status
    payment.payment_status = "VOID"
    if notes:
        payment.notes = notes

    # 인보이스 상태 결정: PAID 상태였으면 VOID, 아직 미결제면 APPROVED로 롤백
    inv_result = await db.execute(
        select(Invoice).where(Invoice.id == payment.invoice_id)
    )
    invoice = inv_result.scalar_one()
    if prev_status == "PAID":
        invoice.status = "VOID"
    else:
        # SCHEDULED/PROCESSING/FAILED → APPROVED로 롤백 (재스케줄 가능)
        invoice.status = "APPROVED"

    await db.flush()
    await db.refresh(payment)

    logger.info("Payment voided: id=%s invoice=%s", payment_id, payment.invoice_id)
    return payment


async def list_payments(
    db: AsyncSession,
    company_id: Optional[UUID] = None,
    invoice_id: Optional[UUID] = None,
    payment_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """결제 목록 조회 (인보이스 요약 포함)"""
    query = (
        select(InvoicePayment, Invoice)
        .join(Invoice, InvoicePayment.invoice_id == Invoice.id)
    )
    count_query = (
        select(func.count())
        .select_from(InvoicePayment)
        .join(Invoice, InvoicePayment.invoice_id == Invoice.id)
    )

    if company_id:
        query = query.where(InvoicePayment.company_id == company_id)
        count_query = count_query.where(InvoicePayment.company_id == company_id)

    if invoice_id:
        query = query.where(InvoicePayment.invoice_id == invoice_id)
        count_query = count_query.where(InvoicePayment.invoice_id == invoice_id)

    if payment_status:
        query = query.where(InvoicePayment.payment_status.cast(String) == payment_status)
        count_query = count_query.where(InvoicePayment.payment_status.cast(String) == payment_status)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(InvoicePayment.created_at.desc()).offset(skip).limit(limit)
    )

    items = []
    for payment, invoice in result.all():
        vendor_name = invoice.vendor.company_name if invoice.vendor else None
        items.append({
            "id": payment.id,
            "company_id": payment.company_id,
            "invoice_id": payment.invoice_id,
            "payment_method": payment.payment_method,
            "payment_status": payment.payment_status,
            "scheduled_date": payment.scheduled_date,
            "paid_date": payment.paid_date,
            "amount_paid": float(payment.amount_paid),
            "transaction_ref": payment.transaction_ref,
            "bank_name": payment.bank_name,
            "notes": payment.notes,
            "created_by": payment.created_by,
            "created_at": payment.created_at,
            "updated_at": payment.updated_at,
            "invoice_number": invoice.invoice_number,
            "vendor_name": vendor_name,
            "invoice_amount_total": float(invoice.amount_total),
        })

    return items, total


async def list_awaiting_payment(
    db: AsyncSession,
    company_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """APPROVED 상태이면서 활성 결제 기록이 없는 인보이스 목록"""
    active_payment_ids = (
        select(InvoicePayment.invoice_id)
        .where(InvoicePayment.payment_status.cast(String).in_(["SCHEDULED", "PROCESSING"]))
    ).correlate(None).scalar_subquery()

    base_filter = [
        Invoice.status.cast(String) == "APPROVED",
        Invoice.id.notin_(select(InvoicePayment.invoice_id).where(
            InvoicePayment.payment_status.cast(String).in_(["SCHEDULED", "PROCESSING"])
        )),
    ]

    if company_id:
        base_filter.append(Invoice.company_id == company_id)

    count_query = select(func.count()).select_from(Invoice).where(*base_filter)
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        select(Invoice)
        .where(*base_filter)
        .order_by(Invoice.due_date.asc().nullslast(), Invoice.updated_at.desc())
        .offset(skip).limit(limit)
    )
    result = await db.execute(query)

    items = []
    for invoice in result.scalars().all():
        items.append({
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "vendor_name": invoice.vendor.company_name if invoice.vendor else None,
            "amount_total": float(invoice.amount_total),
            "currency_original": invoice.currency_original,
            "due_date": invoice.due_date,
            "invoice_date": invoice.invoice_date,
            "approved_at": invoice.updated_at,
        })

    return items, total


async def get_payment(db: AsyncSession, payment_id: UUID) -> InvoicePayment:
    return await _get_payment(db, payment_id)


async def _get_invoice(db: AsyncSession, invoice_id: UUID) -> Invoice:
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


async def _get_payment(db: AsyncSession, payment_id: UUID) -> InvoicePayment:
    result = await db.execute(
        select(InvoicePayment).where(InvoicePayment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment
