from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_line import PurchaseOrderLine
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdate, POLineCreate, POLineUpdate,
)


async def create_purchase_order(
    db: AsyncSession, data: PurchaseOrderCreate, created_by: UUID | None
) -> PurchaseOrder:
    # PO 번호 중복 체크 (같은 회사 내)
    existing = await db.execute(
        select(PurchaseOrder).where(
            PurchaseOrder.company_id == data.company_id,
            PurchaseOrder.po_number == data.po_number,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"PO number '{data.po_number}' already exists in this company",
        )

    # 라인 금액 계산
    lines_data = data.lines
    amount_total = sum(line.quantity * line.unit_price for line in lines_data)

    po = PurchaseOrder(
        company_id=data.company_id,
        vendor_id=data.vendor_id,
        po_number=data.po_number,
        po_date=data.po_date,
        description=data.description,
        notes=data.notes,
        amount_total=amount_total,
        amount_remaining=amount_total,
        created_by=created_by,
    )
    db.add(po)
    await db.flush()

    # 라인 아이템 생성
    for line_data in lines_data:
        line = PurchaseOrderLine(
            po_id=po.id,
            line_number=line_data.line_number,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            amount=round(line_data.quantity * line_data.unit_price, 2),
            category=line_data.category,
        )
        db.add(line)

    await db.flush()
    await db.refresh(po, ["lines"])
    return po


async def get_purchase_order(db: AsyncSession, po_id: UUID) -> PurchaseOrder:
    result = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )
    return po


async def list_purchase_orders(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    company_id: Optional[UUID] = None,
    vendor_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[PurchaseOrder], int]:
    query = select(PurchaseOrder)
    count_query = select(func.count()).select_from(PurchaseOrder)

    if company_id:
        query = query.where(PurchaseOrder.company_id == company_id)
        count_query = count_query.where(PurchaseOrder.company_id == company_id)

    if vendor_id:
        query = query.where(PurchaseOrder.vendor_id == vendor_id)
        count_query = count_query.where(PurchaseOrder.vendor_id == vendor_id)

    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
        count_query = count_query.where(PurchaseOrder.status == status_filter)

    if search:
        query = query.where(PurchaseOrder.po_number.ilike(f"%{search}%"))
        count_query = count_query.where(PurchaseOrder.po_number.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(PurchaseOrder.po_date.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_purchase_order(
    db: AsyncSession, po_id: UUID, data: PurchaseOrderUpdate
) -> PurchaseOrder:
    po = await get_purchase_order(db, po_id)
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(po, field, value)

    await db.flush()
    await db.refresh(po, ["lines"])
    return po


async def add_po_line(
    db: AsyncSession, po_id: UUID, data: POLineCreate
) -> PurchaseOrder:
    po = await get_purchase_order(db, po_id)

    if po.status not in ("OPEN", "PARTIALLY_INVOICED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add lines to PO with status '{po.status}'",
        )

    line = PurchaseOrderLine(
        po_id=po.id,
        line_number=data.line_number,
        description=data.description,
        quantity=data.quantity,
        unit_price=data.unit_price,
        amount=round(data.quantity * data.unit_price, 2),
        category=data.category,
    )
    db.add(line)

    # PO 합계 재계산
    await db.flush()
    await db.refresh(po, ["lines"])
    po.amount_total = sum(float(l.amount) for l in po.lines)
    po.amount_remaining = po.amount_total - float(po.amount_invoiced)
    await db.flush()
    await db.refresh(po, ["lines"])
    return po


async def update_po_line(
    db: AsyncSession, line_id: UUID, data: POLineUpdate
) -> PurchaseOrderLine:
    result = await db.execute(
        select(PurchaseOrderLine).where(PurchaseOrderLine.id == line_id)
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PO line not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(line, field, value)

    # 금액 재계산
    line.amount = round(float(line.quantity) * float(line.unit_price), 2)
    await db.flush()

    # PO 합계 재계산
    po = await get_purchase_order(db, line.po_id)
    await db.refresh(po, ["lines"])
    po.amount_total = sum(float(l.amount) for l in po.lines)
    po.amount_remaining = po.amount_total - float(po.amount_invoiced)
    await db.flush()
    await db.refresh(line)
    return line


async def delete_po_line(db: AsyncSession, line_id: UUID) -> None:
    result = await db.execute(
        select(PurchaseOrderLine).where(PurchaseOrderLine.id == line_id)
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PO line not found",
        )

    po_id = line.po_id
    await db.delete(line)
    await db.flush()

    # PO 합계 재계산
    po = await get_purchase_order(db, po_id)
    await db.refresh(po, ["lines"])
    po.amount_total = sum(float(l.amount) for l in po.lines)
    po.amount_remaining = po.amount_total - float(po.amount_invoiced)
    await db.flush()


async def delete_purchase_order(db: AsyncSession, po_id: UUID) -> None:
    po = await get_purchase_order(db, po_id)

    if po.status not in ("OPEN", "CANCELLED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete PO with status '{po.status}'",
        )

    await db.delete(po)
    await db.flush()
