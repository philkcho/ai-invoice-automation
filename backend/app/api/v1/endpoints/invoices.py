from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
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
