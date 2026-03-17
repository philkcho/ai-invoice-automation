from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.schemas.company_type_setting import (
    CompanyTypeSettingUpdate,
    CompanyTypeSettingResponse,
    CompanyTypeSettingListResponse,
)
from app.services import company_type_setting_service
from app.utils.company_access import verify_company_access

router = APIRouter()


@router.get("", response_model=CompanyTypeSettingListResponse)
async def list_settings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """회사의 인보이스 타입별 연계 설정 목록"""
    company_id = current_user["company_id"]
    items = await company_type_setting_service.list_settings(db, company_id)
    return CompanyTypeSettingListResponse(items=items, total=len(items))


@router.put("/{setting_id}", response_model=CompanyTypeSettingResponse)
async def update_setting(
    setting_id: UUID,
    data: CompanyTypeSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """연계/연계안함 변경"""
    setting = await company_type_setting_service.get_setting(db, setting_id)
    verify_company_access(current_user, setting.company_id)
    updated = await company_type_setting_service.update_setting(db, setting_id, data.link_enabled)
    return CompanyTypeSettingResponse(
        id=updated.id,
        company_id=updated.company_id,
        invoice_type_id=updated.invoice_type_id,
        link_enabled=updated.link_enabled,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        type_code=updated.invoice_type.type_code if updated.invoice_type else None,
        type_name=updated.invoice_type.type_name if updated.invoice_type else None,
    )


@router.post("/initialize", response_model=CompanyTypeSettingListResponse, status_code=201)
async def initialize_settings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 초기 설정 (인보이스 타입별 일괄 생성)"""
    company_id = current_user["company_id"]
    created = await company_type_setting_service.initialize_settings(db, company_id)
    items = await company_type_setting_service.list_settings(db, company_id)
    return CompanyTypeSettingListResponse(items=items, total=len(items))
