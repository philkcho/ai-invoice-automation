from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.global_validation_rule import GlobalValidationRule
from app.schemas.global_rule import GlobalRuleCreate, GlobalRuleUpdate


async def create_rule(db: AsyncSession, data: GlobalRuleCreate, created_by: UUID | None) -> GlobalValidationRule:
    rule = GlobalValidationRule(**data.model_dump(), created_by=created_by)
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


async def get_rule(db: AsyncSession, rule_id: UUID) -> GlobalValidationRule:
    result = await db.execute(select(GlobalValidationRule).where(GlobalValidationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Global rule not found")
    return rule


async def list_rules(
    db: AsyncSession, skip: int = 0, limit: int = 50,
    company_id: Optional[UUID] = None, rule_type: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> tuple[list[GlobalValidationRule], int]:
    query = select(GlobalValidationRule)
    count_query = select(func.count()).select_from(GlobalValidationRule)

    if company_id is not None:
        scope = or_(GlobalValidationRule.company_id == company_id, GlobalValidationRule.company_id.is_(None))
        query = query.where(scope)
        count_query = count_query.where(scope)

    if rule_type:
        query = query.where(GlobalValidationRule.rule_type == rule_type)
        count_query = count_query.where(GlobalValidationRule.rule_type == rule_type)

    if is_active is not None:
        query = query.where(GlobalValidationRule.is_active == is_active)
        count_query = count_query.where(GlobalValidationRule.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(query.order_by(GlobalValidationRule.rule_name).offset(skip).limit(limit))
    return list(result.scalars().all()), total


async def update_rule(db: AsyncSession, rule_id: UUID, data: GlobalRuleUpdate) -> GlobalValidationRule:
    rule = await get_rule(db, rule_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.flush()
    await db.refresh(rule)
    return rule


async def delete_rule(db: AsyncSession, rule_id: UUID) -> None:
    rule = await get_rule(db, rule_id)
    await db.delete(rule)
    await db.flush()
