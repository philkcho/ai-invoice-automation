from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_super_admin, get_current_user
from app.schemas.exchange_rate import ExchangeRateCreate, ExchangeRateResponse, ExchangeRateListResponse
from app.services import exchange_rate_service

router = APIRouter()


@router.post("", response_model=ExchangeRateResponse, status_code=201)
async def create_or_update_rate(
    data: ExchangeRateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    """환율 등록/수정 (Super Admin 전용)"""
    return await exchange_rate_service.create_or_update_rate(db, data, current_user["user_id"])


@router.get("", response_model=ExchangeRateListResponse)
async def list_rates(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
    from_currency: Optional[str] = None, to_currency: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """환율 목록 조회"""
    items, total = await exchange_rate_service.list_rates(db, skip, limit, from_currency, to_currency)
    return ExchangeRateListResponse(items=items, total=total)
