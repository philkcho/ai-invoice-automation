from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_super_admin, require_admin, get_current_user, ROLE_SUPER_ADMIN
from app.schemas.invoice_type import (
    InvoiceTypeCreate, InvoiceTypeUpdate, InvoiceTypeResponse, InvoiceTypeListResponse,
)
from app.services import invoice_type_service

router = APIRouter()


@router.post("", response_model=InvoiceTypeResponse, status_code=201)
async def create_invoice_type(
    data: InvoiceTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """인보이스 타입 생성 (Super Admin: system default, Admin: 자기 회사)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id is None:
            data.company_id = current_user["company_id"]
        elif data.company_id != current_user["company_id"]:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await invoice_type_service.create_invoice_type(db, data)


@router.get("", response_model=InvoiceTypeListResponse)
async def list_invoice_types(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """인보이스 타입 목록 조회 (회사별 + system default 포함)"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await invoice_type_service.list_invoice_types(db, skip, limit, company_id, is_active)
    return InvoiceTypeListResponse(items=items, total=total)


@router.get("/{invoice_type_id}", response_model=InvoiceTypeResponse)
async def get_invoice_type(
    invoice_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """인보이스 타입 상세 조회"""
    return await invoice_type_service.get_invoice_type(db, invoice_type_id)


@router.patch("/{invoice_type_id}", response_model=InvoiceTypeResponse)
async def update_invoice_type(
    invoice_type_id: UUID,
    data: InvoiceTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """인보이스 타입 수정"""
    return await invoice_type_service.update_invoice_type(db, invoice_type_id, data)


@router.delete("/{invoice_type_id}", status_code=204)
async def delete_invoice_type(
    invoice_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    """인보이스 타입 삭제 (Super Admin 전용)"""
    await invoice_type_service.delete_invoice_type(db, invoice_type_id)


@router.post("/seed-defaults", status_code=201)
async def seed_default_types(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    """기본 6종 인보이스 타입 시딩 (Super Admin 전용)"""
    created = await invoice_type_service.seed_default_types(db)
    return {"created": len(created), "message": f"{len(created)} default types seeded"}
