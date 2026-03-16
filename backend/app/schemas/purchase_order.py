from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── PO Line 스키마 ───────────────────────────────────
class POLineCreate(BaseModel):
    line_number: int = Field(..., ge=1)
    description: Optional[str] = None
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    category: Optional[str] = Field(None, max_length=100)


class POLineUpdate(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    category: Optional[str] = Field(None, max_length=100)


class POLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    po_id: UUID
    line_number: int
    description: Optional[str]
    quantity: float
    unit_price: float
    amount: float
    quantity_invoiced: float
    category: Optional[str]


# ── PO 스키마 ────────────────────────────────────────
class PurchaseOrderCreate(BaseModel):
    company_id: UUID
    vendor_id: UUID
    po_number: str = Field(..., min_length=1, max_length=100)
    po_date: date
    description: Optional[str] = None
    notes: Optional[str] = None
    lines: list[POLineCreate] = Field(..., min_length=1)


class PurchaseOrderUpdate(BaseModel):
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^(OPEN|CLOSED|CANCELLED)$")


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vendor_id: UUID
    po_number: str
    po_date: date
    description: Optional[str]
    amount_total: float
    amount_invoiced: float
    amount_remaining: float
    status: str
    file_path: Optional[str]
    notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    lines: list[POLineResponse] = []


class PurchaseOrderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vendor_id: UUID
    po_number: str
    po_date: date
    description: Optional[str]
    amount_total: float
    amount_invoiced: float
    amount_remaining: float
    status: str
    created_at: datetime


class PurchaseOrderListResponse(BaseModel):
    items: list[PurchaseOrderListItem]
    total: int
