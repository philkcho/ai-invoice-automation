from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class PaymentScheduleRequest(BaseModel):
    """결제 스케줄 등록"""
    invoice_id: UUID
    payment_method: str = Field(..., pattern=r"^(ACH|CHECK|WIRE|CREDIT_CARD)$")
    scheduled_date: date
    amount_paid: float = Field(..., gt=0)
    bank_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class PaymentProcessRequest(BaseModel):
    """결제 처리 (PROCESSING으로 전환)"""
    transaction_ref: Optional[str] = Field(None, max_length=100)


class PaymentCompleteRequest(BaseModel):
    """결제 완료 (PAID로 전환)"""
    paid_date: Optional[date] = None
    transaction_ref: Optional[str] = Field(None, max_length=100)


class PaymentVoidRequest(BaseModel):
    """결제 무효화"""
    notes: Optional[str] = None


# ── 응답 스키마 ──────────────────────────────────────
class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    invoice_id: UUID
    payment_method: str
    payment_status: str
    scheduled_date: Optional[date]
    paid_date: Optional[date]
    amount_paid: float
    transaction_ref: Optional[str]
    bank_name: Optional[str]
    notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class PaymentDetailResponse(PaymentResponse):
    """결제 상세 (인보이스 요약 포함)"""
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_amount_total: Optional[float] = None


class PaymentListResponse(BaseModel):
    items: list[PaymentDetailResponse]
    total: int
