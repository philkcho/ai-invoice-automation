from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.approval_setting import ApprovalSetting
from app.schemas.approval_settings import ApprovalSettingCreate, ApprovalSettingUpdate


async def create_setting(
    db: AsyncSession, data: ApprovalSettingCreate
) -> ApprovalSetting:
    """승인 설정 생성"""
    setting = ApprovalSetting(
        company_id=data.company_id,
        invoice_type_id=data.invoice_type_id,
        amount_threshold_min=data.amount_threshold_min,
        amount_threshold_max=data.amount_threshold_max,
        step=data.step,
        step_approver_role=data.step_approver_role,
        is_active=data.is_active,
    )
    db.add(setting)
    await db.flush()
    await db.refresh(setting)
    return setting


async def get_setting(db: AsyncSession, setting_id: UUID) -> ApprovalSetting:
    result = await db.execute(
        select(ApprovalSetting).where(ApprovalSetting.id == setting_id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approval setting not found",
        )
    return setting


async def list_settings(
    db: AsyncSession,
    company_id: Optional[UUID] = None,
    invoice_type_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ApprovalSetting], int]:
    query = select(ApprovalSetting)
    count_query = select(func.count()).select_from(ApprovalSetting)

    if company_id:
        query = query.where(ApprovalSetting.company_id == company_id)
        count_query = count_query.where(ApprovalSetting.company_id == company_id)

    if invoice_type_id:
        query = query.where(ApprovalSetting.invoice_type_id == invoice_type_id)
        count_query = count_query.where(ApprovalSetting.invoice_type_id == invoice_type_id)

    if is_active is not None:
        query = query.where(ApprovalSetting.is_active == is_active)
        count_query = count_query.where(ApprovalSetting.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(
            ApprovalSetting.amount_threshold_min.asc(),
            ApprovalSetting.step.asc(),
        ).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_setting(
    db: AsyncSession, setting_id: UUID, data: ApprovalSettingUpdate
) -> ApprovalSetting:
    setting = await get_setting(db, setting_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(setting, field, value)
    await db.flush()
    await db.refresh(setting)
    return setting


async def delete_setting(db: AsyncSession, setting_id: UUID) -> None:
    setting = await get_setting(db, setting_id)
    await db.delete(setting)
    await db.flush()


async def lookup_approval_steps(
    db: AsyncSession,
    company_id: UUID,
    invoice_type_id: UUID,
    amount_total: float,
) -> list[ApprovalSetting]:
    """인보이스에 해당하는 승인 단계 조회 (설계서 Section 18)

    1. company_id + invoice_type_id + amount 범위 매칭
    2. invoice_type_id=NULL (모든 타입) 폴백
    3. 매칭 없으면 빈 리스트 → 호출부에서 기본 1단계 COMPANY_ADMIN 적용
    """
    # 타입 특정 설정 먼저 조회
    result = await db.execute(
        select(ApprovalSetting).where(
            ApprovalSetting.company_id == company_id,
            ApprovalSetting.invoice_type_id == invoice_type_id,
            ApprovalSetting.is_active.is_(True),
            ApprovalSetting.amount_threshold_min <= amount_total,
        ).where(
            (ApprovalSetting.amount_threshold_max.is_(None))
            | (ApprovalSetting.amount_threshold_max > amount_total)
        ).order_by(ApprovalSetting.step.asc())
    )
    steps = list(result.scalars().all())

    if steps:
        return steps

    # 타입 무관(NULL) 설정 폴백
    result = await db.execute(
        select(ApprovalSetting).where(
            ApprovalSetting.company_id == company_id,
            ApprovalSetting.invoice_type_id.is_(None),
            ApprovalSetting.is_active.is_(True),
            ApprovalSetting.amount_threshold_min <= amount_total,
        ).where(
            (ApprovalSetting.amount_threshold_max.is_(None))
            | (ApprovalSetting.amount_threshold_max > amount_total)
        ).order_by(ApprovalSetting.step.asc())
    )
    return list(result.scalars().all())
