from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.type_rule_set import TypeRuleSet
from app.models.type_rule_condition import TypeRuleCondition
from app.schemas.type_rule import TypeRuleSetCreate, TypeRuleSetUpdate, ConditionCreate, ConditionUpdate


async def create_rule_set(db: AsyncSession, data: TypeRuleSetCreate, created_by: UUID | None) -> TypeRuleSet:
    rule_set = TypeRuleSet(
        company_id=data.company_id,
        invoice_type_id=data.invoice_type_id,
        parent_rule_set_id=data.parent_rule_set_id,
        rule_set_name=data.rule_set_name,
        description=data.description,
        created_by=created_by,
    )
    db.add(rule_set)
    await db.flush()

    for cond in data.conditions:
        condition = TypeRuleCondition(rule_set_id=rule_set.id, **cond.model_dump())
        db.add(condition)

    await db.flush()
    await db.refresh(rule_set, ["conditions"])
    return rule_set


async def get_rule_set(db: AsyncSession, rule_set_id: UUID) -> TypeRuleSet:
    result = await db.execute(select(TypeRuleSet).where(TypeRuleSet.id == rule_set_id))
    rule_set = result.scalar_one_or_none()
    if not rule_set:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Type rule set not found")
    return rule_set


async def list_rule_sets(
    db: AsyncSession, skip: int = 0, limit: int = 50,
    company_id: Optional[UUID] = None, invoice_type_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
) -> tuple[list[TypeRuleSet], int]:
    query = select(TypeRuleSet)
    count_query = select(func.count()).select_from(TypeRuleSet)

    if company_id is not None:
        scope = or_(TypeRuleSet.company_id == company_id, TypeRuleSet.company_id.is_(None))
        query = query.where(scope)
        count_query = count_query.where(scope)

    if invoice_type_id:
        query = query.where(TypeRuleSet.invoice_type_id == invoice_type_id)
        count_query = count_query.where(TypeRuleSet.invoice_type_id == invoice_type_id)

    if is_active is not None:
        query = query.where(TypeRuleSet.is_active == is_active)
        count_query = count_query.where(TypeRuleSet.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(query.order_by(TypeRuleSet.rule_set_name).offset(skip).limit(limit))
    return list(result.scalars().all()), total


async def update_rule_set(db: AsyncSession, rule_set_id: UUID, data: TypeRuleSetUpdate) -> TypeRuleSet:
    rule_set = await get_rule_set(db, rule_set_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule_set, field, value)
    await db.flush()
    await db.refresh(rule_set, ["conditions"])
    return rule_set


async def delete_rule_set(db: AsyncSession, rule_set_id: UUID) -> None:
    rule_set = await get_rule_set(db, rule_set_id)
    await db.delete(rule_set)
    await db.flush()


# ── Conditions ───────────────────────────────────────
async def get_condition(db: AsyncSession, condition_id: UUID) -> TypeRuleCondition:
    result = await db.execute(select(TypeRuleCondition).where(TypeRuleCondition.id == condition_id))
    condition = result.scalar_one_or_none()
    if not condition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Condition not found")
    return condition


async def add_condition(db: AsyncSession, rule_set_id: UUID, data: ConditionCreate) -> TypeRuleCondition:
    await get_rule_set(db, rule_set_id)  # 존재 확인
    condition = TypeRuleCondition(rule_set_id=rule_set_id, **data.model_dump())
    db.add(condition)
    await db.flush()
    await db.refresh(condition)
    return condition


async def update_condition(db: AsyncSession, condition_id: UUID, data: ConditionUpdate) -> TypeRuleCondition:
    result = await db.execute(select(TypeRuleCondition).where(TypeRuleCondition.id == condition_id))
    condition = result.scalar_one_or_none()
    if not condition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Condition not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(condition, field, value)
    await db.flush()
    await db.refresh(condition)
    return condition


async def delete_condition(db: AsyncSession, condition_id: UUID) -> None:
    result = await db.execute(select(TypeRuleCondition).where(TypeRuleCondition.id == condition_id))
    condition = result.scalar_one_or_none()
    if not condition:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Condition not found")
    await db.delete(condition)
    await db.flush()
