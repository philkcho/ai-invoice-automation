from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.company_policy import CompanyPolicy
from app.schemas.company_policy import CompanyPolicyCreate, CompanyPolicyUpdate


async def create_policy(
    db: AsyncSession, data: CompanyPolicyCreate
) -> CompanyPolicy:
    """회사 정책 생성"""
    policy = CompanyPolicy(
        company_id=data.company_id,
        policy_name=data.policy_name,
        policy_text=data.policy_text,
        category=data.category,
        is_active=data.is_active,
    )
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy


async def get_policy(db: AsyncSession, policy_id: UUID) -> CompanyPolicy:
    result = await db.execute(
        select(CompanyPolicy).where(CompanyPolicy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company policy not found",
        )
    return policy


async def list_policies(
    db: AsyncSession,
    company_id: Optional[UUID] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[CompanyPolicy], int]:
    query = select(CompanyPolicy)
    count_query = select(func.count()).select_from(CompanyPolicy)

    if company_id:
        query = query.where(CompanyPolicy.company_id == company_id)
        count_query = count_query.where(CompanyPolicy.company_id == company_id)

    if category:
        query = query.where(CompanyPolicy.category == category)
        count_query = count_query.where(CompanyPolicy.category == category)

    if is_active is not None:
        query = query.where(CompanyPolicy.is_active == is_active)
        count_query = count_query.where(CompanyPolicy.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(
            CompanyPolicy.created_at.desc(),
        ).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_policy(
    db: AsyncSession, policy_id: UUID, data: CompanyPolicyUpdate
) -> CompanyPolicy:
    policy = await get_policy(db, policy_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)
    await db.flush()
    await db.refresh(policy)
    return policy


async def delete_policy(db: AsyncSession, policy_id: UUID) -> None:
    policy = await get_policy(db, policy_id)
    await db.delete(policy)
    await db.flush()


async def get_active_policies_by_category(
    db: AsyncSession,
    company_id: UUID,
    category: Optional[str] = None,
) -> list[CompanyPolicy]:
    """AI 연동용: 특정 회사의 활성 정책을 카테고리별로 조회"""
    query = select(CompanyPolicy).where(
        CompanyPolicy.company_id == company_id,
        CompanyPolicy.is_active.is_(True),
    )
    if category:
        query = query.where(CompanyPolicy.category == category)

    query = query.order_by(CompanyPolicy.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
