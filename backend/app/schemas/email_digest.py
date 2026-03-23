import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DigestSettingUpdate(BaseModel):
    is_active: bool = False
    frequency: str = "weekly"
    daily_hour_utc: int = Field(13, ge=0, le=23)
    weekly_day: int = Field(1, ge=0, le=6)
    include_summary: bool = True
    include_overdue: bool = True
    include_pending: bool = True
    include_top_vendors: bool = False
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = Field(None, gt=0, le=65535)
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_name: Optional[str] = None


class DigestRecipientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    email: str
    name: Optional[str] = None
    is_active: bool
    created_at: datetime


class DigestSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    is_active: bool
    frequency: str
    daily_hour_utc: int
    weekly_day: int
    include_summary: bool
    include_overdue: bool
    include_pending: bool
    include_top_vendors: bool
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_from_name: Optional[str] = None
    recipients: list[DigestRecipientResponse] = []
    created_at: datetime
    updated_at: datetime


class RecipientCreate(BaseModel):
    user_id: Optional[uuid.UUID] = None
    email: EmailStr
    name: Optional[str] = None


class SmtpTestRequest(BaseModel):
    smtp_host: str
    smtp_port: int = Field(587, gt=0, le=65535)
    smtp_user: str
    smtp_password: str
