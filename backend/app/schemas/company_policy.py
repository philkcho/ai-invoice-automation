from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, field_validator

VALID_CATEGORIES = ("APPROVAL", "VALIDATION", "PAYMENT", "GENERAL")


# ── 요청 스키마 ──────────────────────────────────────
class CompanyPolicyCreate(BaseModel):
    company_id: UUID
    policy_name: str = Field(..., min_length=1, max_length=200)
    policy_text: str = Field(..., min_length=1)
    category: str = Field("GENERAL", max_length=20)
    is_active: bool = True

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v = v.upper()
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of {VALID_CATEGORIES}")
        return v


class CompanyPolicyUpdate(BaseModel):
    policy_name: Optional[str] = Field(None, min_length=1, max_length=200)
    policy_text: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper()
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of {VALID_CATEGORIES}")
        return v


# ── 응답 스키마 ──────────────────────────────────────
class CompanyPolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    policy_name: str
    policy_text: str
    category: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CompanyPolicyListResponse(BaseModel):
    items: list[CompanyPolicyResponse]
    total: int
