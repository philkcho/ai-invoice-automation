from datetime import date
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.exchange_rate import ExchangeRate
from app.schemas.exchange_rate import ExchangeRateCreate


async def create_or_update_rate(
    db: AsyncSession, data: ExchangeRateCreate, updated_by: UUID | None
) -> ExchangeRate:
    """환율 등록 (동일 pair+date 존재 시 UPDATE)"""
    existing = await db.execute(
        select(ExchangeRate).where(
            ExchangeRate.from_currency == data.from_currency,
            ExchangeRate.to_currency == data.to_currency,
            ExchangeRate.rate_date == data.rate_date,
        )
    )
    rate = existing.scalar_one_or_none()

    if rate:
        rate.rate = data.rate
        rate.source = data.source
        rate.updated_by = updated_by
    else:
        rate = ExchangeRate(**data.model_dump(), updated_by=updated_by)
        db.add(rate)

    await db.flush()
    await db.refresh(rate)
    return rate


async def get_rate(
    db: AsyncSession, from_currency: str, to_currency: str, target_date: date
) -> Optional[ExchangeRate]:
    """특정 날짜의 환율 조회 (없으면 가장 최근 환율)"""
    # 정확한 날짜
    result = await db.execute(
        select(ExchangeRate).where(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency,
            ExchangeRate.rate_date == target_date,
        )
    )
    rate = result.scalar_one_or_none()
    if rate:
        return rate

    # fallback: 가장 최근 환율
    result = await db.execute(
        select(ExchangeRate).where(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency,
            ExchangeRate.rate_date <= target_date,
        ).order_by(ExchangeRate.rate_date.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def list_rates(
    db: AsyncSession, skip: int = 0, limit: int = 50,
    from_currency: Optional[str] = None, to_currency: Optional[str] = None,
) -> tuple[list[ExchangeRate], int]:
    query = select(ExchangeRate)
    count_query = select(func.count()).select_from(ExchangeRate)

    if from_currency:
        query = query.where(ExchangeRate.from_currency == from_currency)
        count_query = count_query.where(ExchangeRate.from_currency == from_currency)

    if to_currency:
        query = query.where(ExchangeRate.to_currency == to_currency)
        count_query = count_query.where(ExchangeRate.to_currency == to_currency)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(ExchangeRate.rate_date.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total
