from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class ApprovalActionRequest(BaseModel):
    """승인 또는 거절 액션"""
    action: str = Field(..., pattern=r"^(APPROVED|REJECTED)$")
    comments: Optional[str] = None
    rejection_reason: Optional[str] = None


class InvoiceResubmitRequest(BaseModel):
    """거절된 인보이스 재제출"""
    notes: Optional[str] = None


# ── 응답 스키마 ──────────────────────────────────────
class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    invoice_id: UUID
    submission_round: int
    step: int
    approver_role: str
    approver_id: Optional[UUID]
    status: str
    action_at: Optional[datetime]
    comments: Optional[str]
    rejection_reason: Optional[str]
    created_at: datetime


class ApprovalDetailResponse(ApprovalResponse):
    """승인 상세 (인보이스 요약 포함)"""
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    amount_total: Optional[float] = None
    invoice_status: Optional[str] = None


class ApprovalListResponse(BaseModel):
    items: list[ApprovalDetailResponse]
    total: int


class ApprovalHistoryResponse(BaseModel):
    items: list[ApprovalResponse]
    total: int
