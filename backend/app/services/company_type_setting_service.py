from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.company_type_setting import CompanyTypeSetting
from app.models.invoice_type import InvoiceType


async def get_setting(db: AsyncSession, setting_id: UUID) -> CompanyTypeSetting:
    result = await db.execute(
        select(CompanyTypeSetting).where(CompanyTypeSetting.id == setting_id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company type setting not found",
        )
    return setting


async def list_settings(
    db: AsyncSession,
    company_id: UUID,
) -> list[dict]:
    """회사의 타입별 연계 설정 목록 (인보이스 타입 정보 포함)"""
    result = await db.execute(
        select(CompanyTypeSetting)
        .where(CompanyTypeSetting.company_id == company_id)
        .order_by(CompanyTypeSetting.created_at)
    )
    settings = list(result.scalars().all())

    items = []
    for s in settings:
        items.append({
            "id": s.id,
            "company_id": s.company_id,
            "invoice_type_id": s.invoice_type_id,
            "link_enabled": s.link_enabled,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "type_code": s.invoice_type.type_code if s.invoice_type else None,
            "type_name": s.invoice_type.type_name if s.invoice_type else None,
        })
    return items


async def update_setting(
    db: AsyncSession,
    setting_id: UUID,
    link_enabled: bool,
) -> CompanyTypeSetting:
    setting = await get_setting(db, setting_id)
    setting.link_enabled = link_enabled
    await db.flush()
    await db.refresh(setting)
    return setting


async def initialize_settings(
    db: AsyncSession,
    company_id: UUID,
) -> list[CompanyTypeSetting]:
    """회사의 인보이스 타입별 설정 초기화 (누락된 타입만 추가)"""
    # 이미 설정된 invoice_type_id 조회
    existing_result = await db.execute(
        select(CompanyTypeSetting.invoice_type_id)
        .where(CompanyTypeSetting.company_id == company_id)
    )
    existing_type_ids = set(existing_result.scalars().all())

    # 회사에 해당하는 인보이스 타입 + system default 조회
    type_result = await db.execute(
        select(InvoiceType)
        .where(
            or_(
                InvoiceType.company_id == company_id,
                InvoiceType.company_id.is_(None),
            ),
            InvoiceType.is_active == True,
        )
        .order_by(InvoiceType.sort_order)
    )
    invoice_types = list(type_result.scalars().all())

    if not invoice_types:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No invoice types found. Please seed default types first.",
        )

    created = []
    for it in invoice_types:
        if it.id not in existing_type_ids:
            setting = CompanyTypeSetting(
                company_id=company_id,
                invoice_type_id=it.id,
                link_enabled=False,
            )
            db.add(setting)
            created.append(setting)

    if created:
        await db.flush()
        for s in created:
            await db.refresh(s)
    return created
