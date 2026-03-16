"""
OCR Celery Task — 인보이스 파일에서 데이터 추출 (비동기)
최대 3회 재시도, 60초 간격.
"""
import asyncio
import logging
from uuid import UUID

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.ocr_tasks.process_invoice_ocr",
)
def process_invoice_ocr(self, invoice_id: str, file_path: str):
    """인보이스 OCR 처리 (Celery Worker에서 실행)"""
    logger.info("Starting OCR for invoice %s, file: %s", invoice_id, file_path)

    try:
        result = asyncio.run(_run_ocr(invoice_id, file_path))
        logger.info("OCR completed for invoice %s: %s", invoice_id, result.get("status"))
        return result
    except Exception as exc:
        logger.error("OCR failed for invoice %s: %s", invoice_id, exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60)
        else:
            logger.critical("OCR max retries exceeded for invoice %s", invoice_id)
            asyncio.run(_mark_ocr_failed(invoice_id))
            return {"status": "FAILED", "invoice_id": invoice_id, "error": str(exc)}


async def _run_ocr(invoice_id: str, file_path: str) -> dict:
    """OCR 실행 + DB 업데이트"""
    from app.core.database import AsyncSessionLocal
    from app.models.invoice import Invoice
    from app.services.ocr_service import extract_invoice_data
    from sqlalchemy import select

    ocr_data = await extract_invoice_data(file_path)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Invoice).where(Invoice.id == UUID(invoice_id))
        )
        invoice = result.scalar_one_or_none()

        if not invoice:
            return {"status": "ERROR", "error": "Invoice not found"}

        # OCR 결과를 invoice에 반영
        invoice.raw_text = ocr_data.get("_raw_text", "")
        invoice.ocr_status = "COMPLETED"
        invoice.status = "OCR_REVIEW"

        # 추출된 데이터 반영 (기존 값이 없는 경우만)
        if not invoice.invoice_number and ocr_data.get("invoice_number"):
            invoice.invoice_number = ocr_data["invoice_number"]
        if not invoice.invoice_date and ocr_data.get("invoice_date"):
            from datetime import date
            try:
                invoice.invoice_date = date.fromisoformat(ocr_data["invoice_date"])
            except (ValueError, TypeError):
                pass
        if not invoice.due_date and ocr_data.get("due_date"):
            from datetime import date
            try:
                invoice.due_date = date.fromisoformat(ocr_data["due_date"])
            except (ValueError, TypeError):
                pass
        if ocr_data.get("total_amount"):
            invoice.amount_total = float(ocr_data["total_amount"])
        if ocr_data.get("subtotal"):
            invoice.amount_subtotal = float(ocr_data["subtotal"])
        if ocr_data.get("tax_amount"):
            invoice.amount_tax = float(ocr_data["tax_amount"])
        if ocr_data.get("po_number"):
            invoice.po_number = ocr_data["po_number"]
        if ocr_data.get("currency"):
            invoice.currency_original = ocr_data["currency"]

        # 라인 아이템 생성
        if ocr_data.get("line_items"):
            from app.models.invoice_line_item import InvoiceLineItem
            for i, item in enumerate(ocr_data["line_items"], 1):
                line = InvoiceLineItem(
                    invoice_id=invoice.id,
                    line_number=i,
                    description=item.get("description"),
                    quantity=float(item.get("quantity", 1)),
                    unit_price=float(item.get("unit_price", 0)),
                    amount=float(item.get("amount", 0)),
                )
                db.add(line)

        await db.commit()

    return {
        "status": "COMPLETED",
        "invoice_id": invoice_id,
        "extracted_fields": list(ocr_data.keys()),
    }


async def _mark_ocr_failed(invoice_id: str):
    """OCR 실패 시 상태 업데이트"""
    from app.core.database import AsyncSessionLocal
    from app.models.invoice import Invoice
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Invoice).where(Invoice.id == UUID(invoice_id))
        )
        invoice = result.scalar_one_or_none()
        if invoice:
            invoice.ocr_status = "FAILED"
            invoice.status = "OCR_REVIEW"  # 수동 처리 필요
            await db.commit()
