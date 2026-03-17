from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.recurring_amount import RecurringAmount
from app.schemas.recurring_amount import RecurringAmountCreate, RecurringAmountUpdate


async def create_recurring_amount(
    db: AsyncSession, data: RecurringAmountCreate, company_id: UUID,
) -> RecurringAmount:
    item = RecurringAmount(company_id=company_id, **data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def get_recurring_amount(db: AsyncSession, item_id: UUID) -> RecurringAmount:
    result = await db.execute(
        select(RecurringAmount).where(RecurringAmount.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring amount not found",
        )
    return item


async def list_recurring_amounts(
    db: AsyncSession,
    company_id: UUID,
    skip: int = 0,
    limit: int = 50,
    is_active: Optional[bool] = None,
) -> tuple[list[RecurringAmount], int]:
    query = select(RecurringAmount).where(RecurringAmount.company_id == company_id)
    count_query = select(func.count()).select_from(RecurringAmount).where(
        RecurringAmount.company_id == company_id
    )

    if is_active is not None:
        query = query.where(RecurringAmount.is_active == is_active)
        count_query = count_query.where(RecurringAmount.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(RecurringAmount.effective_from.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_recurring_amount(
    db: AsyncSession, item_id: UUID, data: RecurringAmountUpdate,
) -> RecurringAmount:
    item = await get_recurring_amount(db, item_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return item


async def delete_recurring_amount(db: AsyncSession, item_id: UUID) -> None:
    item = await get_recurring_amount(db, item_id)
    await db.delete(item)
    await db.flush()
