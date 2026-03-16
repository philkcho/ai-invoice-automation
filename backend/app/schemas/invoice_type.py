from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class InvoiceTypeCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = system default")
    type_code: str = Field(..., min_length=1, max_length=50)
    type_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    requires_po: bool = False
    requires_approver: bool = False
    sort_order: int = 0


class InvoiceTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    requires_po: Optional[bool] = None
    requires_approver: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class InvoiceTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    type_code: str
    type_name: str
    description: Optional[str]
    requires_po: bool
    requires_approver: bool
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class InvoiceTypeListResponse(BaseModel):
    items: list[InvoiceTypeResponse]
    total: int
