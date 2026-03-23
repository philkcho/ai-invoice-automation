import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.purchase_order import PurchaseOrder
from app.models.linkage_detail import LinkageDetail
from app.models.validation_result import ValidationResult as VResult
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.services.validation_service import validate_invoice
from app.services.approval_service import start_approval_workflow

logger = logging.getLogger(__name__)


async def create_invoice(
    db: AsyncSession, data: InvoiceCreate, created_by: UUID | None
) -> Invoice:
    """인보이스 생성 (수동 입력 또는 OCR 후 생성)"""
    # 동일 회사 내 Invoice # 중복 체크
    if data.invoice_number:
        dup_result = await db.execute(
            select(Invoice).where(
                Invoice.company_id == data.company_id,
                Invoice.invoice_number == data.invoice_number,
            ).limit(1)
        )
        if dup_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invoice number '{data.invoice_number}' already exists",
            )

    # 라인 금액 계산
    lines_data = data.lines
    amount_subtotal = sum(round(l.quantity * l.unit_price, 2) for l in lines_data)
    amount_tax = sum(l.tax_amount for l in lines_data)
    amount_total = amount_subtotal + amount_tax

    # 수동 입력이면 바로 PENDING, OCR이면 OCR_REVIEW
    if data.source_channel == "MANUAL":
        initial_status = "PENDING"
        ocr_status = None
    else:
        initial_status = "RECEIVED"
        ocr_status = "PENDING"

    # PO 번호로 PurchaseOrder 자동 연결
    po_id = data.po_id
    if not po_id and data.po_number:
        po_result = await db.execute(
            select(PurchaseOrder).where(
                PurchaseOrder.company_id == data.company_id,
                PurchaseOrder.po_number == data.po_number,
            )
        )
        matched_po = po_result.scalar_one_or_none()
        if matched_po:
            po_id = matched_po.id

    # PO 번호로 LinkageDetail 자동 연결 (SELECT FOR UPDATE로 동시성 보호)
    matched_linkage = None
    if data.po_number:
        linkage_result = await db.execute(
            select(LinkageDetail).where(
                LinkageDetail.company_id == data.company_id,
                LinkageDetail.linkage_no == data.po_number,
                LinkageDetail.invoice_type_id == data.invoice_type_id,
            ).with_for_update()
        )
        matched_linkage = linkage_result.scalar_one_or_none()

    invoice = Invoice(
        company_id=data.company_id,
        vendor_id=data.vendor_id,
        invoice_type_id=data.invoice_type_id,
        invoice_number=data.invoice_number,
        invoice_date=data.invoice_date,
        due_date=data.due_date,
        amount_subtotal=amount_subtotal,
        amount_tax=amount_tax,
        amount_total=amount_total,
        currency_original=data.currency_original,
        amount_original=data.amount_original,
        po_number=data.po_number,
        po_id=po_id,
        source_channel=data.source_channel,
        file_path=data.file_path,
        ocr_status=ocr_status,
        status=initial_status,
        notes=data.notes,
        created_by=created_by,
    )
    db.add(invoice)
    await db.flush()

    # PO 금액 업데이트 (Decimal 사용으로 부동소수점 오차 방지)
    if po_id:
        po = await db.execute(
            select(PurchaseOrder).where(PurchaseOrder.id == po_id)
        )
        po_obj = po.scalar_one_or_none()
        if po_obj:
            po_obj.amount_invoiced = Decimal(str(po_obj.amount_invoiced)) + Decimal(str(amount_total))
            po_obj.amount_remaining = Decimal(str(po_obj.amount_total)) - Decimal(str(po_obj.amount_invoiced))
            if po_obj.amount_remaining <= 0:
                po_obj.status = "FULLY_INVOICED"
            else:
                po_obj.status = "PARTIALLY_INVOICED"
            await db.flush()

    # LinkageDetail 금액 업데이트 (Subtotal만, Sales Tax 제외, Decimal 사용)
    if matched_linkage:
        matched_linkage.amount_invoiced = Decimal(str(matched_linkage.amount_invoiced)) + Decimal(str(amount_subtotal))
        matched_linkage.amount_remaining = Decimal(str(matched_linkage.amount)) - Decimal(str(matched_linkage.amount_invoiced))
        await db.flush()

    # 라인 아이템 생성
    for line_data in lines_data:
        line = InvoiceLineItem(
            invoice_id=invoice.id,
            line_number=line_data.line_number,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            amount=round(line_data.quantity * line_data.unit_price, 2),
            category=line_data.category,
            po_line_id=line_data.po_line_id,
            tax_rate_id=line_data.tax_rate_id,
            tax_amount=line_data.tax_amount,
        )
        db.add(line)

    await db.flush()

    # 수동 입력이면 자동 validation 실행
    if data.source_channel == "MANUAL" and lines_data:
        await _run_and_save_validation(db, invoice)
        await db.flush()

    await db.refresh(invoice)
    return invoice


async def get_invoice(db: AsyncSession, invoice_id: UUID) -> Invoice:
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


async def list_invoices(
    db: AsyncSession, skip: int = 0, limit: int = 20,
    company_id: Optional[UUID] = None, vendor_id: Optional[UUID] = None,
    status_filter: Optional[str] = None, search: Optional[str] = None,
    invoice_type_id: Optional[UUID] = None,
) -> tuple[list[Invoice], int]:
    query = select(Invoice)
    count_query = select(func.count()).select_from(Invoice)

    if company_id:
        query = query.where(Invoice.company_id == company_id)
        count_query = count_query.where(Invoice.company_id == company_id)

    if vendor_id:
        query = query.where(Invoice.vendor_id == vendor_id)
        count_query = count_query.where(Invoice.vendor_id == vendor_id)

    if invoice_type_id:
        query = query.where(Invoice.invoice_type_id == invoice_type_id)
        count_query = count_query.where(Invoice.invoice_type_id == invoice_type_id)

    if status_filter:
        query = query.where(Invoice.status == status_filter)
        count_query = count_query.where(Invoice.status == status_filter)

    if search:
        search_filter = or_(
            Invoice.invoice_number.ilike(f"%{search}%"),
            Invoice.po_number.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_invoice(db: AsyncSession, invoice_id: UUID, data: InvoiceUpdate) -> Invoice:
    invoice = await get_invoice(db, invoice_id)
    update_data = data.model_dump(exclude_unset=True)

    # lines를 별도 처리
    new_lines = update_data.pop("lines", None)

    for field, value in update_data.items():
        setattr(invoice, field, value)

    # Line items 교체
    old_subtotal = Decimal(str(invoice.amount_subtotal))
    if new_lines is not None:
        # 기존 line items 삭제
        for li in list(invoice.line_items):
            await db.delete(li)
        await db.flush()

        # 새 line items 생성
        amount_subtotal = Decimal("0")
        amount_tax = Decimal("0")
        for line_data in new_lines:
            line = InvoiceLineItem(
                invoice_id=invoice.id,
                line_number=line_data["line_number"],
                description=line_data.get("description"),
                quantity=line_data["quantity"],
                unit_price=line_data["unit_price"],
                amount=round(line_data["quantity"] * line_data["unit_price"], 2),
                tax_amount=line_data.get("tax_amount", 0),
            )
            db.add(line)
            amount_subtotal += Decimal(str(line.amount))
            amount_tax += Decimal(str(line.tax_amount))

        # 금액 재계산
        invoice.amount_subtotal = amount_subtotal
        invoice.amount_tax = amount_tax
        invoice.amount_total = amount_subtotal + amount_tax

    await db.flush()

    # LinkageDetail 금액 업데이트 (Subtotal 변경 시, Sales Tax 제외, Decimal 사용)
    new_subtotal = Decimal(str(invoice.amount_subtotal))
    diff = new_subtotal - old_subtotal
    if diff != 0 and invoice.po_number:
        linkage_result = await db.execute(
            select(LinkageDetail).where(
                LinkageDetail.company_id == invoice.company_id,
                LinkageDetail.linkage_no == invoice.po_number,
                LinkageDetail.invoice_type_id == invoice.invoice_type_id,
            ).with_for_update()
        )
        linkage = linkage_result.scalar_one_or_none()
        if linkage:
            linkage.amount_invoiced = Decimal(str(linkage.amount_invoiced)) + diff
            linkage.amount_remaining = Decimal(str(linkage.amount)) - Decimal(str(linkage.amount_invoiced))
            await db.flush()

    await db.refresh(invoice)
    return invoice


async def delete_invoice(db: AsyncSession, invoice_id: UUID) -> None:
    invoice = await get_invoice(db, invoice_id)
    if invoice.status not in ("RECEIVED", "OCR_REVIEW", "PENDING", "REVIEW_NEEDED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete invoice with status '{invoice.status}'",
        )

    # LinkageDetail 금액 복구 (Decimal 사용, SELECT FOR UPDATE로 동시성 보호)
    if invoice.po_number and Decimal(str(invoice.amount_total)) > 0:
        linkage_result = await db.execute(
            select(LinkageDetail).where(
                LinkageDetail.company_id == invoice.company_id,
                LinkageDetail.linkage_no == invoice.po_number,
                LinkageDetail.invoice_type_id == invoice.invoice_type_id,
            ).with_for_update()
        )
        linkage = linkage_result.scalar_one_or_none()
        if linkage:
            linkage.amount_invoiced = max(Decimal("0"), Decimal(str(linkage.amount_invoiced)) - Decimal(str(invoice.amount_subtotal)))
            linkage.amount_remaining = Decimal(str(linkage.amount)) - Decimal(str(linkage.amount_invoiced))
            await db.flush()

    # line items 먼저 삭제
    for li in list(invoice.line_items):
        await db.delete(li)
    await db.flush()
    await db.delete(invoice)
    await db.flush()


async def run_validation(db: AsyncSession, invoice_id: UUID) -> dict:
    """인보이스에 대해 3-layer validation 실행 및 결과 저장"""
    invoice = await get_invoice(db, invoice_id)
    return await _run_and_save_validation(db, invoice)


async def confirm_invoice(db: AsyncSession, invoice_id: UUID) -> Invoice:
    """인보이스 확정 (RECEIVED/OCR_REVIEW → PENDING)"""
    invoice = await get_invoice(db, invoice_id)

    if invoice.status not in ("OCR_REVIEW", "RECEIVED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm invoice with status '{invoice.status}'. Only RECEIVED or OCR_REVIEW invoices can be confirmed.",
        )

    invoice.status = "PENDING"
    await db.flush()
    await db.refresh(invoice)
    return invoice


async def submit_invoice(db: AsyncSession, invoice_id: UUID) -> Invoice:
    """인보이스 제출 (PENDING → SUBMITTED 또는 REVIEW_NEEDED)"""
    invoice = await get_invoice(db, invoice_id)

    if invoice.status not in ("PENDING", "REVIEW_NEEDED", "REJECTED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit invoice with status '{invoice.status}'",
        )

    # validation 실행
    result = await _run_and_save_validation(db, invoice)

    if result["overall"] == "FAIL":
        invoice.status = "REVIEW_NEEDED"
        invoice.validation_status = "FAIL"
    else:
        # PASS 또는 WARNING → 승인 워크플로우 시작
        invoice.validation_status = result["overall"]
        await db.flush()
        try:
            await start_approval_workflow(db, invoice)
        except Exception as e:
            # 승인 워크플로우 실패 시 인보이스 상태를 REVIEW_NEEDED로 되돌림
            logger.error("Failed to start approval workflow for invoice %s: %s", invoice_id, e)
            invoice.status = "REVIEW_NEEDED"
            invoice.validation_status = "FAIL"

    await db.flush()
    await db.refresh(invoice)
    return invoice


async def _run_and_save_validation(db: AsyncSession, invoice: Invoice) -> dict:
    """validation 실행 + validation_results 테이블 저장"""
    invoice_data = {
        "amount_total": float(invoice.amount_total),
        "payment_terms": None,  # TODO: vendor의 payment_terms 연결
        "due_date": str(invoice.due_date) if invoice.due_date else None,
        "invoice_number": invoice.invoice_number,
        "vendor_id": str(invoice.vendor_id),
        "has_approver": True,  # Phase 7: 승인 워크플로우 연동 완료
    }

    result = await validate_invoice(
        db, invoice.company_id, invoice.invoice_type_id,
        invoice.vendor_id, invoice_data,
    )

    # validation_results 저장
    for r in result["results"]:
        vr = VResult(
            company_id=invoice.company_id,
            invoice_id=invoice.id,
            submission_round=invoice.submission_round,
            layer=r["layer"],
            rule_id=UUID(r["rule_id"]) if r.get("rule_id") else None,
            rule_table=r.get("rule_table"),
            rule_name=r.get("rule_name"),
            condition_name=r.get("condition_name"),
            result=r["result"],
            reason=r.get("reason"),
        )
        db.add(vr)

    # invoice validation_status 업데이트
    invoice.validation_status = result["overall"]
    await db.flush()

    return result
