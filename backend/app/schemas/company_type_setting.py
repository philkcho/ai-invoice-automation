from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CompanyTypeSettingUpdate(BaseModel):
    link_enabled: bool


class CompanyTypeSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    invoice_type_id: UUID
    link_enabled: bool
    created_at: datetime
    updated_at: datetime
    # 인보이스 타입 정보 (조인)
    type_code: Optional[str] = None
    type_name: Optional[str] = None


class CompanyTypeSettingListResponse(BaseModel):
    items: list[CompanyTypeSettingResponse]
    total: int
