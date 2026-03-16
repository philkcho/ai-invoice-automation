from datetime import datetime
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class GlobalRuleCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = system template")
    parent_rule_id: Optional[UUID] = None
    rule_name: str = Field(..., min_length=1, max_length=255)
    rule_type: str = Field(..., pattern=r"^(MAX_AMOUNT|PAYMENT_TERMS|REQUIRED_DOC|DUPLICATE_CHECK|DUE_DATE|ANNUAL_LIMIT)$")
    severity: str = Field(..., pattern=r"^(FAIL|WARNING)$")
    config: Optional[dict[str, Any]] = None
    apply_to_category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None


class GlobalRuleUpdate(BaseModel):
    rule_name: Optional[str] = Field(None, min_length=1, max_length=255)
    severity: Optional[str] = Field(None, pattern=r"^(FAIL|WARNING)$")
    config: Optional[dict[str, Any]] = None
    apply_to_category: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    description: Optional[str] = None


class GlobalRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    parent_rule_id: Optional[UUID]
    rule_name: str
    rule_type: str
    severity: str
    config: Optional[dict[str, Any]]
    apply_to_category: Optional[str]
    is_active: bool
    description: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class GlobalRuleListResponse(BaseModel):
    items: list[GlobalRuleResponse]
    total: int
