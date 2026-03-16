from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class CompanyCreate(BaseModel):
    company_code: str = Field(..., min_length=1, max_length=20)
    company_name: str = Field(..., min_length=1, max_length=255)
    ein: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    zip: Optional[str] = Field(None, max_length=20)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    fiscal_year_start: str = Field("01-01", pattern=r"^\d{2}-\d{2}$", description="MM-DD format")
    default_currency: str = Field("USD", max_length=10)
    s3_bucket_prefix: Optional[str] = Field(None, max_length=100)


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    ein: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=50)
    zip: Optional[str] = Field(None, max_length=20)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    fiscal_year_start: Optional[str] = Field(None, pattern=r"^\d{2}-\d{2}$")
    default_currency: Optional[str] = Field(None, max_length=10)
    s3_bucket_prefix: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern=r"^(ACTIVE|INACTIVE)$")


# ── 응답 스키마 ──────────────────────────────────────
class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_code: str
    company_name: str
    ein: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    fiscal_year_start: str
    default_currency: str
    s3_bucket_prefix: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
