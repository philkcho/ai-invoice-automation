from datetime import datetime, date
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class VendorContractCreate(BaseModel):
    company_id: UUID
    vendor_id: UUID
    invoice_type_id: Optional[UUID] = None
    contract_name: str = Field(..., min_length=1, max_length=255)
    contract_number: Optional[str] = Field(None, max_length=100)
    effective_date: date
    expiry_date: date
    expiry_warning_days: int = 30
    max_order_amount: Optional[float] = Field(None, ge=0)
    allowed_categories: Optional[str] = None
    contracted_prices: Optional[dict[str, Any]] = None
    price_tolerance_pct: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None


class VendorContractUpdate(BaseModel):
    contract_name: Optional[str] = Field(None, min_length=1, max_length=255)
    contract_number: Optional[str] = Field(None, max_length=100)
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    expiry_warning_days: Optional[int] = None
    max_order_amount: Optional[float] = Field(None, ge=0)
    allowed_categories: Optional[str] = None
    contracted_prices: Optional[dict[str, Any]] = None
    price_tolerance_pct: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class VendorContractResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vendor_id: UUID
    invoice_type_id: Optional[UUID]
    contract_name: str
    contract_number: Optional[str]
    effective_date: date
    expiry_date: date
    expiry_warning_days: int
    max_order_amount: Optional[float]
    allowed_categories: Optional[str]
    contracted_prices: Optional[dict[str, Any]]
    price_tolerance_pct: Optional[float]
    notes: Optional[str]
    file_path: Optional[str]
    is_active: bool
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class VendorContractListResponse(BaseModel):
    items: list[VendorContractResponse]
    total: int
