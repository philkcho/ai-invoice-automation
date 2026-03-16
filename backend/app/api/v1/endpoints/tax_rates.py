from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_super_admin, require_admin, get_current_user, ROLE_SUPER_ADMIN
from app.schemas.tax_rate import (
    TaxRateCreate, TaxRateUpdate, TaxRateResponse, TaxRateListResponse,
)
from app.services import tax_rate_service

router = APIRouter()


@router.post("", response_model=TaxRateResponse, status_code=201)
async def create_tax_rate(
    data: TaxRateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """세율 생성 (Super Admin: system default, Admin: 자기 회사)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id is None:
            data.company_id = current_user["company_id"]
        elif data.company_id != current_user["company_id"]:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await tax_rate_service.create_tax_rate(db, data)


@router.get("", response_model=TaxRateListResponse)
async def list_tax_rates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    company_id: Optional[UUID] = None,
    state_code: Optional[str] = Query(None, max_length=5),
    tax_type: Optional[str] = Query(None, pattern=r"^(FEDERAL|STATE_SALES|STATE_USE|EXEMPT)$"),
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """세율 목록 조회 (회사별 + system default 포함)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        company_id = current_user["company_id"]

    items, total = await tax_rate_service.list_tax_rates(
        db, skip, limit, company_id, state_code, tax_type, is_active
    )
    return TaxRateListResponse(items=items, total=total)


@router.get("/{tax_rate_id}", response_model=TaxRateResponse)
async def get_tax_rate(
    tax_rate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """세율 상세 조회"""
    return await tax_rate_service.get_tax_rate(db, tax_rate_id)


@router.patch("/{tax_rate_id}", response_model=TaxRateResponse)
async def update_tax_rate(
    tax_rate_id: UUID,
    data: TaxRateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """세율 수정"""
    return await tax_rate_service.update_tax_rate(db, tax_rate_id, data)


@router.delete("/{tax_rate_id}", status_code=204)
async def delete_tax_rate(
    tax_rate_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """세율 삭제"""
    await tax_rate_service.delete_tax_rate(db, tax_rate_id)
