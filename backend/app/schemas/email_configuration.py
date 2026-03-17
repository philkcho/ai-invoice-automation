from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, EmailStr


# ── 요청 스키마 ──────────────────────────────────────
class EmailConfigCreate(BaseModel):
    company_id: UUID
    email_provider: str = Field(..., pattern=r"^(GMAIL|OUTLOOK)$")
    email_address: EmailStr
    filter_keywords: Optional[str] = None
    filter_senders: Optional[str] = None
    is_active: bool = True


class EmailConfigUpdate(BaseModel):
    filter_keywords: Optional[str] = None
    filter_senders: Optional[str] = None
    is_active: Optional[bool] = None


# ── 응답 스키마 ──────────────────────────────────────
class EmailConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    email_provider: str
    email_address: str
    filter_keywords: Optional[str]
    filter_senders: Optional[str]
    is_active: bool
    last_polled_at: Optional[datetime]
    poll_error_count: int
    last_error_message: Optional[str]
    created_at: datetime
    updated_at: datetime


class EmailConfigListResponse(BaseModel):
    items: list[EmailConfigResponse]
    total: int


# ── OAuth 관련 ───────────────────────────────────────
class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class OAuthUrlResponse(BaseModel):
    auth_url: str


# ── 테스트 폴링 응답 ────────────────────────────────
class TestPollResponse(BaseModel):
    emails_fetched: int
    invoices_created: int
    errors: list[str]
