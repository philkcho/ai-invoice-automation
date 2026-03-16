from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    require_super_admin, require_admin, get_current_user,
    ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN,
)
from app.schemas.vendor import (
    VendorCreate, VendorUpdate, VendorResponse,
    VendorListResponse, VendorCreateResponse,
)
from app.services import vendor_service
from app.services.vendor_service import vendor_to_response_dict

router = APIRouter()


@router.post("", response_model=VendorCreateResponse, status_code=201)
async def create_vendor(
    data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """벤더 등록 (Super Admin: shared pool + any company, Company Admin: own company only)"""
    # Company Admin 제한
    if current_user["role"] == ROLE_COMPANY_ADMIN:
        if data.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admin can create shared pool vendors",
            )
        if data.company_id != current_user["company_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company Admin can only create vendors in own company",
            )

    vendor, warnings = await vendor_service.create_vendor(db, data)
    return VendorCreateResponse(
        vendor=VendorResponse(**vendor_to_response_dict(vendor)),
        warnings=warnings,
    )


@router.get("", response_model=VendorListResponse)
async def list_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    company_id: Optional[UUID] = None,
    include_shared: bool = Query(True, description="Include shared pool vendors"),
    status: Optional[str] = Query(None, pattern=r"^(ACTIVE|INACTIVE)$"),
    search: Optional[str] = Query(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """벤더 목록 조회 (Company Admin은 자기 회사 + shared pool)"""
    # Company Admin은 자기 회사로 고정
    if current_user["role"] not in (ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN):
        company_id = current_user["company_id"]
    elif current_user["role"] == ROLE_COMPANY_ADMIN:
        company_id = current_user["company_id"]

    items, total = await vendor_service.list_vendors(
        db, skip, limit, company_id, include_shared, status, search
    )
    return VendorListResponse(
        items=[VendorResponse(**vendor_to_response_dict(v)) for v in items],
        total=total,
    )


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """벤더 상세 조회"""
    vendor = await vendor_service.get_vendor(db, vendor_id)

    # 접근 권한 체크: shared pool 또는 자기 회사
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if vendor.company_id is not None and vendor.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return VendorResponse(**vendor_to_response_dict(vendor))


@router.patch("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: UUID,
    data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """벤더 수정"""
    vendor = await vendor_service.get_vendor(db, vendor_id)

    # 권한 체크
    if current_user["role"] == ROLE_COMPANY_ADMIN:
        if vendor.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admin can modify shared pool vendors",
            )
        if vendor.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    vendor = await vendor_service.update_vendor(db, vendor_id, data)
    return VendorResponse(**vendor_to_response_dict(vendor))


@router.delete("/{vendor_id}", status_code=204)
async def delete_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """벤더 삭제"""
    vendor = await vendor_service.get_vendor(db, vendor_id)

    if current_user["role"] == ROLE_COMPANY_ADMIN:
        if vendor.company_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admin can delete shared pool vendors",
            )
        if vendor.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await vendor_service.delete_vendor(db, vendor_id)
