from datetime import datetime
from typing import Optional
from uuid import UUID

import re

from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator


def validate_password_strength(password: str) -> str:
    """비밀번호 복잡도 검증: 8자 이상, 대문자, 소문자, 숫자, 특수문자 각 1개 이상"""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
        raise ValueError("Password must contain at least one special character")
    return password


# ── 요청 스키마 ──────────────────────────────────────
class UserCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = Super Admin")
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(..., pattern=r"^(SUPER_ADMIN|COMPANY_ADMIN|ACCOUNTANT|APPROVER|VIEWER)$")
    password: str = Field(..., min_length=8, max_length=128)
    notification_email: bool = True
    approval_level: int = Field(0, ge=0, le=5)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = Field(None, pattern=r"^(SUPER_ADMIN|COMPANY_ADMIN|ACCOUNTANT|APPROVER|VIEWER)$")
    is_active: Optional[bool] = None
    notification_email: Optional[bool] = None
    approval_level: Optional[int] = Field(None, ge=0, le=5)
    company_id: Optional[UUID] = Field(None, description="Super Admin만 변경 가능 (회사 간 이동)")


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, v: str) -> str:
        return validate_password_strength(v)


# ── 응답 스키마 ──────────────────────────────────────
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    company_name: Optional[str] = None
    email: str
    full_name: str
    role: str
    is_active: bool
    email_verified: bool = False
    last_login: Optional[datetime]
    notification_email: bool
    approval_level: int = 0
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
