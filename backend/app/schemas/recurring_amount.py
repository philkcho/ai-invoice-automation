from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class RecurringAmountCreate(BaseModel):
    vendor_id: Optional[UUID] = None
    description: str = Field(..., min_length=1, max_length=500)
    monthly_amount: float = Field(..., gt=0)
    currency: str = Field("USD", max_length=3)
    effective_from: date
    effective_to: Optional[date] = None
    notes: Optional[str] = None


class RecurringAmountUpdate(BaseModel):
    vendor_id: Optional[UUID] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    monthly_amount: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class RecurringAmountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    vendor_id: Optional[UUID]
    description: str
    monthly_amount: float
    currency: str
    effective_from: date
    effective_to: Optional[date]
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class RecurringAmountListResponse(BaseModel):
    items: list[RecurringAmountResponse]
    total: int
