from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, ROLE_SUPER_ADMIN
from app.schemas.approval_settings import (
    ApprovalSettingCreate, ApprovalSettingUpdate,
    ApprovalSettingResponse, ApprovalSettingListResponse,
)
from app.services import approval_settings_service

router = APIRouter()


@router.post("", response_model=ApprovalSettingResponse, status_code=201)
async def create_approval_setting(
    data: ApprovalSettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """승인 설정 생성 (COMPANY_ADMIN 이상)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await approval_settings_service.create_setting(db, data)


@router.get("", response_model=ApprovalSettingListResponse)
async def list_approval_settings(
    invoice_type_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """승인 설정 목록 조회"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await approval_settings_service.list_settings(
        db, company_id, invoice_type_id, is_active, skip, limit
    )
    return ApprovalSettingListResponse(items=items, total=total)


@router.get("/{setting_id}", response_model=ApprovalSettingResponse)
async def get_approval_setting(
    setting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """승인 설정 상세 조회"""
    setting = await approval_settings_service.get_setting(db, setting_id)
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if setting.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return setting


@router.patch("/{setting_id}", response_model=ApprovalSettingResponse)
async def update_approval_setting(
    setting_id: UUID,
    data: ApprovalSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """승인 설정 수정"""
    setting = await approval_settings_service.get_setting(db, setting_id)
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if setting.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await approval_settings_service.update_setting(db, setting_id, data)


@router.delete("/{setting_id}", status_code=204)
async def delete_approval_setting(
    setting_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """승인 설정 삭제"""
    setting = await approval_settings_service.get_setting(db, setting_id)
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if setting.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    await approval_settings_service.delete_setting(db, setting_id)
