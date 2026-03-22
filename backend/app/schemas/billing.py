from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── 요금제 스키마 ───────────────────────────────────
class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    display_name: str
    monthly_price: float
    max_invoices_per_month: int
    max_users: int
    max_ocr_per_month: int
    features: Optional[str] = None
    is_active: bool
    sort_order: int


class PlanListResponse(BaseModel):
    items: list[PlanResponse]


# ── 구독 스키마 ─────────────────────────────────────
class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    plan_id: UUID
    plan: Optional[PlanResponse] = None
    status: str
    stripe_customer_id: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    canceled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ── 사용량 스키마 ───────────────────────────────────
class UsageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year_month: str
    invoice_count: int
    ocr_count: int
    user_count: int
    # 한도 정보 (서비스에서 추가)
    max_invoices: int = 0
    max_ocr: int = 0
    max_users: int = 0


# ── Stripe Checkout 스키마 ─────────────────────────
class CheckoutSessionRequest(BaseModel):
    plan_name: str


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class CustomerPortalResponse(BaseModel):
    portal_url: str


# ── Billing 요약 스키마 ────────────────────────────
class BillingSummaryResponse(BaseModel):
    subscription: Optional[SubscriptionResponse] = None
    usage: Optional[UsageResponse] = None
    stripe_publishable_key: Optional[str] = None
