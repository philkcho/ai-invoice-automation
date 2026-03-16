from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_super_admin, require_admin, ROLE_SUPER_ADMIN
from app.utils.company_access import verify_company_access
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
    CompanyListResponse,
)
from app.services import company_service

router = APIRouter()


@router.post("", response_model=CompanyResponse, status_code=201)
async def create_company(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_super_admin),
):
    """회사 생성 (Super Admin 전용)"""
    return await company_service.create_company(db, data)


@router.get("", response_model=CompanyListResponse)
async def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, pattern=r"^(ACTIVE|INACTIVE)$"),
    search: Optional[str] = Query(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 목록 조회 (Super Admin: 전체, Company Admin: 자기 회사만)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        # Company Admin은 자기 회사만 조회
        company = await company_service.get_company(db, current_user["company_id"])
        return CompanyListResponse(items=[company], total=1)

    items, total = await company_service.list_companies(db, skip, limit, status, search)
    return CompanyListResponse(items=items, total=total)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 상세 조회 (Admin 이상, Company Admin은 자기 회사만)"""
    verify_company_access(current_user, company_id)
    return await company_service.get_company(db, company_id)


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    data: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_super_admin),
):
    """회사 수정 (Super Admin 전용)"""
    return await company_service.update_company(db, company_id, data)


@router.delete("/{company_id}", status_code=204)
async def delete_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_super_admin),
):
    """회사 삭제 (Super Admin 전용, 소속 사용자 없을 때만)"""
    await company_service.delete_company(db, company_id)
