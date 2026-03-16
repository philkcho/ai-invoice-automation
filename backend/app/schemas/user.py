from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ── 요청 스키마 ──────────────────────────────────────
class UserCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = Super Admin")
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(..., pattern=r"^(SUPER_ADMIN|COMPANY_ADMIN|ACCOUNTANT|APPROVER|VIEWER)$")
    password: str = Field(..., min_length=8, max_length=128)
    notification_email: bool = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = Field(None, pattern=r"^(SUPER_ADMIN|COMPANY_ADMIN|ACCOUNTANT|APPROVER|VIEWER)$")
    is_active: Optional[bool] = None
    notification_email: Optional[bool] = None
    company_id: Optional[UUID] = Field(None, description="Super Admin만 변경 가능 (회사 간 이동)")


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)


# ── 응답 스키마 ──────────────────────────────────────
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    notification_email: bool
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
