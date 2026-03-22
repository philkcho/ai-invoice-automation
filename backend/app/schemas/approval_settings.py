from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class ApprovalSettingCreate(BaseModel):
    company_id: UUID
    invoice_type_id: Optional[UUID] = None
    amount_threshold_min: float = Field(0, ge=0)
    amount_threshold_max: Optional[float] = Field(None, ge=0)
    step: int = Field(..., ge=1)
    step_approver_role: Optional[str] = Field(None, pattern=r"^(APPROVER|COMPANY_ADMIN)$")
    approver_user_id: Optional[UUID] = None
    is_active: bool = True


class ApprovalSettingUpdate(BaseModel):
    invoice_type_id: Optional[UUID] = None
    amount_threshold_min: Optional[float] = Field(None, ge=0)
    amount_threshold_max: Optional[float] = Field(None, ge=0)
    step: Optional[int] = Field(None, ge=1)
    step_approver_role: Optional[str] = Field(None, pattern=r"^(APPROVER|COMPANY_ADMIN)$")
    approver_user_id: Optional[UUID] = None
    is_active: Optional[bool] = None


# ── 응답 스키마 ──────────────────────────────────────
class ApprovalSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    invoice_type_id: Optional[UUID]
    amount_threshold_min: float
    amount_threshold_max: Optional[float]
    step: int
    step_approver_role: Optional[str]
    approver_user_id: Optional[UUID] = None
    approver_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ApprovalSettingListResponse(BaseModel):
    items: list[ApprovalSettingResponse]
    total: int
