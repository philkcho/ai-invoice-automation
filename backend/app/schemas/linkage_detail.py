from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class LinkageDetailCreate(BaseModel):
    linkage_no: str = Field(..., min_length=1, max_length=100)
    vendor_id: Optional[UUID] = None
    amount: float = Field(..., ge=0)


class LinkageDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    invoice_type_id: UUID
    linkage_no: str
    vendor_id: Optional[UUID]
    amount: float
    amount_invoiced: float = 0
    amount_remaining: float = 0
    created_at: datetime
    updated_at: datetime


class LinkageDetailListResponse(BaseModel):
    items: list[LinkageDetailResponse]
    total: int


class LinkageDetailBulkSave(BaseModel):
    """인보이스 타입별 상세 내역 일괄 저장"""
    invoice_type_id: UUID
    details: list[LinkageDetailCreate]
