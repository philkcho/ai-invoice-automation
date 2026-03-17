from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.schemas.linkage_detail import (
    LinkageDetailResponse, LinkageDetailListResponse, LinkageDetailBulkSave,
)
from app.services import linkage_detail_service

router = APIRouter()


@router.get("/{invoice_type_id}", response_model=LinkageDetailListResponse)
async def list_details(
    invoice_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    company_id = current_user["company_id"]
    items = await linkage_detail_service.list_by_type(db, company_id, invoice_type_id)
    return LinkageDetailListResponse(items=items, total=len(items))


@router.post("", response_model=LinkageDetailListResponse, status_code=201)
async def bulk_save(
    data: LinkageDetailBulkSave,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    company_id = current_user["company_id"]
    items = await linkage_detail_service.bulk_save(
        db, company_id, data.invoice_type_id, data.details,
    )
    return LinkageDetailListResponse(items=items, total=len(items))


@router.delete("/{invoice_type_id}", status_code=204)
async def delete_details(
    invoice_type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    company_id = current_user["company_id"]
    await linkage_detail_service.delete_by_type(db, company_id, invoice_type_id)
