from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.invoice_type import InvoiceType
from app.schemas.invoice_type import InvoiceTypeCreate, InvoiceTypeUpdate


async def create_invoice_type(db: AsyncSession, data: InvoiceTypeCreate) -> InvoiceType:
    # type_code 중복 체크 (같은 스코프 내)
    if data.company_id:
        scope_filter = InvoiceType.company_id == data.company_id
    else:
        scope_filter = InvoiceType.company_id.is_(None)

    existing = await db.execute(
        select(InvoiceType).where(scope_filter, InvoiceType.type_code == data.type_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invoice type code '{data.type_code}' already exists",
        )

    invoice_type = InvoiceType(**data.model_dump())
    db.add(invoice_type)
    await db.flush()
    await db.refresh(invoice_type)
    return invoice_type


async def get_invoice_type(db: AsyncSession, invoice_type_id: UUID) -> InvoiceType:
    result = await db.execute(
        select(InvoiceType).where(InvoiceType.id == invoice_type_id)
    )
    invoice_type = result.scalar_one_or_none()
    if not invoice_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice type not found",
        )
    return invoice_type


async def list_invoice_types(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    company_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
) -> tuple[list[InvoiceType], int]:
    query = select(InvoiceType)
    count_query = select(func.count()).select_from(InvoiceType)

    if company_id is not None:
        scope = or_(InvoiceType.company_id == company_id, InvoiceType.company_id.is_(None))
        query = query.where(scope)
        count_query = count_query.where(scope)

    if is_active is not None:
        query = query.where(InvoiceType.is_active == is_active)
        count_query = count_query.where(InvoiceType.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(InvoiceType.sort_order, InvoiceType.type_code).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_invoice_type(
    db: AsyncSession, invoice_type_id: UUID, data: InvoiceTypeUpdate
) -> InvoiceType:
    invoice_type = await get_invoice_type(db, invoice_type_id)
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(invoice_type, field, value)

    await db.flush()
    await db.refresh(invoice_type)
    return invoice_type


async def delete_invoice_type(db: AsyncSession, invoice_type_id: UUID) -> None:
    invoice_type = await get_invoice_type(db, invoice_type_id)
    await db.delete(invoice_type)
    await db.flush()


async def seed_default_types(db: AsyncSession) -> list[InvoiceType]:
    """설계서 기본 6종 인보이스 타입 시딩"""
    defaults = [
        ("PO", "Purchase Order", "PO# match, qty/price verify", True, False, 1),
        ("FREIGHT", "Freight / Logistics", "Route, rate check", False, False, 2),
        ("SERVICE", "Service Contract", "Contracted rate, deliverables", False, False, 3),
        ("RECURRING", "Recurring", "Fixed amount, billing cycle", False, False, 4),
        ("UTILITY", "Utility", "Prior month variance", False, False, 5),
        ("PROFESSIONAL", "Professional Service", "Hourly rate, approver required", False, True, 6),
    ]

    created = []
    for code, name, desc, req_po, req_approver, order in defaults:
        existing = await db.execute(
            select(InvoiceType).where(
                InvoiceType.company_id.is_(None),
                InvoiceType.type_code == code,
            )
        )
        if not existing.scalar_one_or_none():
            it = InvoiceType(
                company_id=None,
                type_code=code,
                type_name=name,
                description=desc,
                requires_po=req_po,
                requires_approver=req_approver,
                sort_order=order,
            )
            db.add(it)
            created.append(it)

    if created:
        await db.flush()
    return created
