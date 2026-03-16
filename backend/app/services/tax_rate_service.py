from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.tax_rate import TaxRate
from app.schemas.tax_rate import TaxRateCreate, TaxRateUpdate


async def create_tax_rate(db: AsyncSession, data: TaxRateCreate) -> TaxRate:
    tax_rate = TaxRate(**data.model_dump())
    db.add(tax_rate)
    await db.flush()
    await db.refresh(tax_rate)
    return tax_rate


async def get_tax_rate(db: AsyncSession, tax_rate_id: UUID) -> TaxRate:
    result = await db.execute(select(TaxRate).where(TaxRate.id == tax_rate_id))
    tax_rate = result.scalar_one_or_none()
    if not tax_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax rate not found",
        )
    return tax_rate


async def list_tax_rates(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    company_id: Optional[UUID] = None,
    state_code: Optional[str] = None,
    tax_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> tuple[list[TaxRate], int]:
    query = select(TaxRate)
    count_query = select(func.count()).select_from(TaxRate)

    # company_id 필터: 지정된 회사 + system default(NULL) 포함
    if company_id is not None:
        scope = or_(TaxRate.company_id == company_id, TaxRate.company_id.is_(None))
        query = query.where(scope)
        count_query = count_query.where(scope)

    if state_code:
        query = query.where(TaxRate.state_code == state_code)
        count_query = count_query.where(TaxRate.state_code == state_code)

    if tax_type:
        query = query.where(TaxRate.tax_type == tax_type)
        count_query = count_query.where(TaxRate.tax_type == tax_type)

    if is_active is not None:
        query = query.where(TaxRate.is_active == is_active)
        count_query = count_query.where(TaxRate.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(TaxRate.state_code, TaxRate.tax_name).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_tax_rate(
    db: AsyncSession, tax_rate_id: UUID, data: TaxRateUpdate
) -> TaxRate:
    tax_rate = await get_tax_rate(db, tax_rate_id)
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(tax_rate, field, value)

    await db.flush()
    await db.refresh(tax_rate)
    return tax_rate


async def delete_tax_rate(db: AsyncSession, tax_rate_id: UUID) -> None:
    tax_rate = await get_tax_rate(db, tax_rate_id)
    await db.delete(tax_rate)
    await db.flush()
