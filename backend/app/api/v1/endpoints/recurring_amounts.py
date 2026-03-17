from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, get_current_user
from app.schemas.recurring_amount import (
    RecurringAmountCreate, RecurringAmountUpdate,
    RecurringAmountResponse, RecurringAmountListResponse,
)
from app.services import recurring_amount_service
from app.utils.company_access import verify_company_access

router = APIRouter()


@router.post("", response_model=RecurringAmountResponse, status_code=201)
async def create_recurring_amount(
    data: RecurringAmountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    company_id = current_user["company_id"]
    return await recurring_amount_service.create_recurring_amount(db, data, company_id)


@router.get("", response_model=RecurringAmountListResponse)
async def list_recurring_amounts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    company_id = current_user["company_id"]
    items, total = await recurring_amount_service.list_recurring_amounts(
        db, company_id, skip, limit, is_active,
    )
    return RecurringAmountListResponse(items=items, total=total)


@router.get("/{item_id}", response_model=RecurringAmountResponse)
async def get_recurring_amount(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    item = await recurring_amount_service.get_recurring_amount(db, item_id)
    verify_company_access(current_user, item.company_id)
    return item


@router.patch("/{item_id}", response_model=RecurringAmountResponse)
async def update_recurring_amount(
    item_id: UUID,
    data: RecurringAmountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    item = await recurring_amount_service.get_recurring_amount(db, item_id)
    verify_company_access(current_user, item.company_id)
    return await recurring_amount_service.update_recurring_amount(db, item_id, data)


@router.delete("/{item_id}", status_code=204)
async def delete_recurring_amount(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    item = await recurring_amount_service.get_recurring_amount(db, item_id)
    verify_company_access(current_user, item.company_id)
    await recurring_amount_service.delete_recurring_amount(db, item_id)
