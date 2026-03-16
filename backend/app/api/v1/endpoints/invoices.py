from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    require_admin, require_accountant_up, get_current_user,
    ROLE_SUPER_ADMIN,
)
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    InvoiceListResponse, ValidationRunResponse,
)
from app.services import invoice_service
from app.utils.file_handler import save_file, get_file_url

router = APIRouter()


@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 생성 (수동 입력)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await invoice_service.create_invoice(db, data, current_user["user_id"])


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    vendor_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """인보이스 목록 조회"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await invoice_service.list_invoices(
        db, skip, limit, company_id, vendor_id, status, search
    )
    return InvoiceListResponse(items=items, total=total)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """인보이스 상세 조회 (라인 아이템 포함)"""
    invoice = await invoice_service.get_invoice(db, invoice_id)
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if invoice.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 수정"""
    return await invoice_service.update_invoice(db, invoice_id, data)


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """인보이스 삭제 (초기 상태만)"""
    await invoice_service.delete_invoice(db, invoice_id)


@router.post("/{invoice_id}/validate", response_model=ValidationRunResponse)
async def run_validation(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 validation 실행"""
    return await invoice_service.run_validation(db, invoice_id)


@router.post("/{invoice_id}/submit", response_model=InvoiceResponse)
async def submit_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 제출 (validation 실행 후 상태 변경)"""
    return await invoice_service.submit_invoice(db, invoice_id)


@router.post("/{invoice_id}/upload")
async def upload_invoice_file(
    invoice_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스에 파일 첨부 (PDF/이미지 업로드)"""
    invoice = await invoice_service.get_invoice(db, invoice_id)

    if current_user["role"] != ROLE_SUPER_ADMIN:
        if invoice.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # 회사 코드 조회
    from app.models.company import Company
    result = await db.execute(select(Company).where(Company.id == invoice.company_id))
    company = result.scalar_one()

    try:
        file_content = await file.read()
        file_path = await save_file(
            file_content=file_content,
            filename=file.filename or "upload",
            company_code=company.company_code,
            category="invoices",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # invoice에 파일 경로 저장
    invoice.file_path = file_path
    if invoice.source_channel != "MANUAL":
        invoice.status = "RECEIVED"
        invoice.ocr_status = "PENDING"
    await db.flush()
    await db.refresh(invoice, ["line_items"])

    # OCR task 비동기 실행
    ocr_task_id = None
    if invoice.source_channel != "MANUAL":
        from app.tasks.ocr_tasks import process_invoice_ocr
        task = process_invoice_ocr.delay(str(invoice_id), file_path)
        ocr_task_id = task.id

    return {
        "file_path": file_path,
        "file_url": get_file_url(file_path),
        "invoice_id": str(invoice_id),
        "ocr_task_id": ocr_task_id,
    }


# ── 로컬 개발용 미디어 서빙 ─────────────────────────
from fastapi.responses import FileResponse
import os

@router.get("/media/{file_path:path}")
async def serve_media(file_path: str):
    """로컬 개발 환경 미디어 파일 서빙"""
    from app.core.config import settings
    if settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=404, detail="Not available in production")

    full_path = os.path.join("/app/media", file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(full_path)
