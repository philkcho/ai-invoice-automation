from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class TaxRateCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = system default")
    tax_name: str = Field(..., min_length=1, max_length=100)
    tax_type: str = Field(..., pattern=r"^(FEDERAL|STATE_SALES|STATE_USE|EXEMPT)$")
    state_code: Optional[str] = Field(None, max_length=5)
    rate_pct: float = Field(..., ge=0, le=100)
    effective_date: date
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class TaxRateUpdate(BaseModel):
    tax_name: Optional[str] = Field(None, min_length=1, max_length=100)
    tax_type: Optional[str] = Field(None, pattern=r"^(FEDERAL|STATE_SALES|STATE_USE|EXEMPT)$")
    state_code: Optional[str] = Field(None, max_length=5)
    rate_pct: Optional[float] = Field(None, ge=0, le=100)
    effective_date: Optional[date] = None
    expiry_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


# ── 응답 스키마 ──────────────────────────────────────
class TaxRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    tax_name: str
    tax_type: str
    state_code: Optional[str]
    rate_pct: float
    effective_date: date
    expiry_date: Optional[date]
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class TaxRateListResponse(BaseModel):
    items: list[TaxRateResponse]
    total: int
