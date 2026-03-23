import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    require_admin, require_accountant_up, get_current_user,
    ROLE_SUPER_ADMIN,
)
from app.utils.company_access import verify_company_access
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    InvoiceListResponse, ValidationRunResponse,
)
from app.services import invoice_service
from app.utils.file_handler import save_file, get_file_url

router = APIRouter()


# ── 로컬 개발용 미디어 서빙 (/{invoice_id} 보다 앞에 위치해야 라우트 충돌 방지) ──
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


@router.get("/check-duplicate")
async def check_duplicate_invoice(
    invoice_number: str = Query(...),
    vendor_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 번호 중복 체크"""
    from app.models.invoice import Invoice

    query = select(Invoice).where(Invoice.invoice_number == invoice_number)
    company_id = current_user.get("company_id")
    if company_id:
        query = query.where(Invoice.company_id == company_id)
    if vendor_id:
        query = query.where(Invoice.vendor_id == vendor_id)

    result = await db.execute(query.limit(1))
    existing = result.scalar_one_or_none()
    return {
        "duplicate": existing is not None,
        "existing_id": str(existing.id) if existing else None,
        "existing_status": existing.status if existing else None,
    }


@router.post("/extract", status_code=200)
async def extract_invoice_from_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """파일 업로드 후 AI로 인보이스 데이터 추출 (인보이스 생성 전 미리보기)"""
    from app.models.company import Company
    from app.services.ocr_service import extract_invoice_data

    # 회사 코드 조회
    company_id = current_user.get("company_id")
    if not company_id:
        result = await db.execute(select(Company).limit(1))
        company = result.scalar_one_or_none()
        if not company:
            raise HTTPException(status_code=400, detail="No company found")
        company_code = company.company_code
    else:
        result = await db.execute(select(Company).where(Company.id == company_id))
        company = result.scalar_one()
        company_code = company.company_code

    # 파일 저장
    try:
        file_content = await file.read()
        file_path = await save_file(
            file_content=file_content,
            filename=file.filename or "upload",
            company_code=company_code,
            category="invoices",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # AI OCR 추출 (동기적 실행)
    try:
        extracted = await extract_invoice_data(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI extraction failed: {str(e)}",
        )

    return {
        "file_path": file_path,
        "file_url": get_file_url(file_path),
        "extracted": extracted,
    }


@router.post("", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 생성 (수동 입력)"""
    verify_company_access(current_user, data.company_id)
    return await invoice_service.create_invoice(db, data, current_user["user_id"])


@router.get("", response_model=InvoiceListResponse)
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    vendor_id: Optional[UUID] = None,
    invoice_type_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """인보이스 목록 조회"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await invoice_service.list_invoices(
        db, skip, limit, company_id, vendor_id, status, search, invoice_type_id
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
    verify_company_access(current_user, invoice.company_id)
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 수정"""
    invoice = await invoice_service.get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
    return await invoice_service.update_invoice(db, invoice_id, data)


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """인보이스 삭제 (초기 상태만)"""
    invoice = await invoice_service.get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
    await invoice_service.delete_invoice(db, invoice_id)


@router.post("/{invoice_id}/validate", response_model=ValidationRunResponse)
async def run_validation(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 validation 실행"""
    invoice = await invoice_service.get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
    return await invoice_service.run_validation(db, invoice_id)


@router.post("/{invoice_id}/confirm", response_model=InvoiceResponse)
async def confirm_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """OCR 검토 완료 확정 (OCR_REVIEW → PENDING)"""
    invoice = await invoice_service.get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
    return await invoice_service.confirm_invoice(db, invoice_id)


@router.post("/{invoice_id}/submit", response_model=InvoiceResponse)
async def submit_invoice(
    invoice_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 제출 (validation 실행 후 상태 변경)"""
    invoice = await invoice_service.get_invoice(db, invoice_id)
    verify_company_access(current_user, invoice.company_id)
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
    verify_company_access(current_user, invoice.company_id)

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
