from datetime import datetime, date
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── Line Item 스키마 ─────────────────────────────────
class InvoiceLineCreate(BaseModel):
    line_number: int = Field(..., ge=1)
    description: Optional[str] = None
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    category: Optional[str] = Field(None, max_length=100)
    po_line_id: Optional[UUID] = None
    tax_rate_id: Optional[UUID] = None
    tax_amount: float = 0


class InvoiceLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    invoice_id: UUID
    line_number: int
    description: Optional[str]
    quantity: float
    unit_price: float
    amount: float
    category: Optional[str]
    po_line_id: Optional[UUID]
    matched_contract_price: Optional[float]
    price_variance_pct: Optional[float]
    tax_rate_id: Optional[UUID]
    tax_amount: float


# ── Invoice 스키마 ───────────────────────────────────
class InvoiceCreate(BaseModel):
    company_id: UUID
    vendor_id: UUID
    invoice_type_id: UUID
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency_original: str = "USD"
    amount_original: Optional[float] = None
    po_number: Optional[str] = Field(None, max_length=100)
    po_id: Optional[UUID] = None
    source_channel: str = Field("MANUAL", pattern=r"^(UPLOAD|GMAIL|OUTLOOK|MANUAL)$")
    notes: Optional[str] = None
    lines: list[InvoiceLineCreate] = []


class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = Field(None, max_length=100)
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency_original: Optional[str] = None
    amount_original: Optional[float] = None
    po_number: Optional[str] = Field(None, max_length=100)
    po_id: Optional[UUID] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vendor_id: UUID
    invoice_type_id: UUID
    invoice_number: Optional[str]
    invoice_date: Optional[date]
    due_date: Optional[date]
    amount_subtotal: float
    amount_tax: float
    amount_total: float
    currency_original: str
    amount_original: Optional[float]
    exchange_rate_id: Optional[UUID]
    po_number: Optional[str]
    po_id: Optional[UUID]
    source_channel: str
    source_email: Optional[str]
    file_path: Optional[str]
    ocr_status: Optional[str]
    status: str
    validation_status: Optional[str]
    rejection_reason: Optional[str]
    submission_round: int
    notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    line_items: list[InvoiceLineResponse] = []


class InvoiceListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vendor_id: UUID
    invoice_type_id: UUID
    invoice_number: Optional[str]
    invoice_date: Optional[date]
    due_date: Optional[date]
    amount_total: float
    currency_original: str
    source_channel: str
    ocr_status: Optional[str]
    status: str
    validation_status: Optional[str]
    created_at: datetime


class InvoiceListResponse(BaseModel):
    items: list[InvoiceListItem]
    total: int


class ValidationRunResponse(BaseModel):
    overall: str
    total_checks: int
    fail_count: int
    warning_count: int
    pass_count: int
    results: list[dict[str, Any]]
