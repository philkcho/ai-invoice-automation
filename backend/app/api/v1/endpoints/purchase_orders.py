from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    require_admin, require_accountant_up, get_current_user,
    ROLE_SUPER_ADMIN,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdate,
    PurchaseOrderResponse, PurchaseOrderListResponse,
    POLineCreate, POLineUpdate, POLineResponse,
)
from app.services import po_service

router = APIRouter()


@router.post("", response_model=PurchaseOrderResponse, status_code=201)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """PO 생성 (Accountant 이상)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return await po_service.create_purchase_order(db, data, current_user["user_id"])


@router.get("", response_model=PurchaseOrderListResponse)
async def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    company_id: Optional[UUID] = None,
    vendor_id: Optional[UUID] = None,
    status: Optional[str] = Query(None, pattern=r"^(OPEN|PARTIALLY_INVOICED|FULLY_INVOICED|CLOSED|CANCELLED)$"),
    search: Optional[str] = Query(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """PO 목록 조회"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        company_id = current_user["company_id"]

    items, total = await po_service.list_purchase_orders(
        db, skip, limit, company_id, vendor_id, status, search
    )
    return PurchaseOrderListResponse(items=items, total=total)


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """PO 상세 조회 (라인 아이템 포함)"""
    po = await po_service.get_purchase_order(db, po_id)
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if po.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return po


@router.patch("/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: UUID,
    data: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """PO 수정 (상태 변경, 메모 등)"""
    return await po_service.update_purchase_order(db, po_id, data)


@router.delete("/{po_id}", status_code=204)
async def delete_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """PO 삭제 (OPEN/CANCELLED 상태만)"""
    await po_service.delete_purchase_order(db, po_id)


# ── PO Lines ─────────────────────────────────────────
@router.post("/{po_id}/lines", response_model=PurchaseOrderResponse, status_code=201)
async def add_po_line(
    po_id: UUID,
    data: POLineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """PO에 라인 아이템 추가"""
    return await po_service.add_po_line(db, po_id, data)


@router.patch("/lines/{line_id}", response_model=POLineResponse)
async def update_po_line(
    line_id: UUID,
    data: POLineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """PO 라인 아이템 수정"""
    return await po_service.update_po_line(db, line_id, data)


@router.delete("/lines/{line_id}", status_code=204)
async def delete_po_line(
    line_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """PO 라인 아이템 삭제"""
    await po_service.delete_po_line(db, line_id)
