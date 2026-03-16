from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class VendorCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = shared pool")
    vendor_code: str = Field(..., min_length=1, max_length=20)
    company_name: str = Field(..., min_length=1, max_length=255)
    dba: Optional[str] = Field(None, max_length=255)
    ein: Optional[str] = Field(None, max_length=20)
    w9_submitted: bool = False
    is_1099_required: bool = False
    is_tax_exempt: bool = False
    tax_exempt_expiry_date: Optional[str] = None
    website: Optional[str] = Field(None, max_length=255)
    vendor_category: Optional[str] = Field(None, pattern=r"^(SERVICE|PRODUCT|BOTH)$")
    # Billing
    billing_address: Optional[str] = None
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=50)
    billing_zip: Optional[str] = Field(None, max_length=20)
    # Shipping
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = Field(None, max_length=100)
    shipping_state: Optional[str] = Field(None, max_length=50)
    shipping_zip: Optional[str] = Field(None, max_length=20)
    # Contact
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    contact_email: Optional[str] = Field(None, max_length=255)
    # Payment
    payment_terms: Optional[str] = Field(None, max_length=50)
    bank_name: Optional[str] = Field(None, max_length=255)
    ach_routing: Optional[str] = Field(None, max_length=20, description="평문 입력, 서버에서 암호화")
    ach_account: Optional[str] = Field(None, max_length=100, description="평문 입력, 서버에서 암호화")
    # Internal
    internal_buyer: Optional[str] = Field(None, max_length=255)
    approved_by: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class VendorUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    dba: Optional[str] = Field(None, max_length=255)
    ein: Optional[str] = Field(None, max_length=20)
    w9_submitted: Optional[bool] = None
    is_1099_required: Optional[bool] = None
    is_tax_exempt: Optional[bool] = None
    tax_exempt_expiry_date: Optional[str] = None
    website: Optional[str] = Field(None, max_length=255)
    vendor_category: Optional[str] = Field(None, pattern=r"^(SERVICE|PRODUCT|BOTH)$")
    status: Optional[str] = Field(None, pattern=r"^(ACTIVE|INACTIVE)$")
    billing_address: Optional[str] = None
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=50)
    billing_zip: Optional[str] = Field(None, max_length=20)
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = Field(None, max_length=100)
    shipping_state: Optional[str] = Field(None, max_length=50)
    shipping_zip: Optional[str] = Field(None, max_length=20)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    contact_email: Optional[str] = Field(None, max_length=255)
    payment_terms: Optional[str] = Field(None, max_length=50)
    bank_name: Optional[str] = Field(None, max_length=255)
    ach_routing: Optional[str] = Field(None, max_length=20)
    ach_account: Optional[str] = Field(None, max_length=100)
    internal_buyer: Optional[str] = Field(None, max_length=255)
    approved_by: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


# ── 응답 스키마 ──────────────────────────────────────
class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    vendor_code: str
    company_name: str
    dba: Optional[str]
    ein: Optional[str]
    w9_submitted: bool
    is_1099_required: bool
    is_tax_exempt: bool
    tax_exempt_expiry_date: Optional[str]
    website: Optional[str]
    vendor_category: Optional[str]
    status: str
    billing_address: Optional[str]
    billing_city: Optional[str]
    billing_state: Optional[str]
    billing_zip: Optional[str]
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    shipping_zip: Optional[str]
    contact_name: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    payment_terms: Optional[str]
    bank_name: Optional[str]
    # ACH 필드는 응답에서 마스킹
    ach_routing_masked: Optional[str] = None
    ach_account_masked: Optional[str] = None
    internal_buyer: Optional[str]
    approved_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class VendorListResponse(BaseModel):
    items: list[VendorResponse]
    total: int


# ── 중복 경고 ────────────────────────────────────────
class DuplicateWarning(BaseModel):
    type: str  # "EIN_EXACT", "NAME_FUZZY", "ACH_DUPLICATE"
    message: str
    existing_vendor_id: UUID
    existing_vendor_name: str
    score: Optional[float] = None  # fuzzy match score


class VendorCreateResponse(BaseModel):
    vendor: VendorResponse
    warnings: list[DuplicateWarning] = []
