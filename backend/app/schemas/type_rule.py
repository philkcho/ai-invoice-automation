from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ── Condition ────────────────────────────────────────
class ConditionCreate(BaseModel):
    condition_name: str = Field(..., min_length=1, max_length=255)
    condition_type: str = Field(..., pattern=r"^(AMOUNT_MATCH|RATE_CHECK|CYCLE_CHECK|VARIANCE_CHECK|ROUTE_CHECK|DELIVERABLE_CHECK|HOURLY_RATE_CHECK|REQUIRES_APPROVER)$")
    severity: str = Field(..., pattern=r"^(FAIL|WARNING)$")
    operator: str = Field(..., pattern=r"^(EQ|NEQ|GT|LT|GTE|LTE|IN|BETWEEN|PCT_VARIANCE)$")
    threshold_value: Optional[str] = Field(None, max_length=255)
    threshold_value2: Optional[str] = Field(None, max_length=255)
    field_target: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0


class ConditionUpdate(BaseModel):
    condition_name: Optional[str] = Field(None, min_length=1, max_length=255)
    severity: Optional[str] = Field(None, pattern=r"^(FAIL|WARNING)$")
    operator: Optional[str] = Field(None, pattern=r"^(EQ|NEQ|GT|LT|GTE|LTE|IN|BETWEEN|PCT_VARIANCE)$")
    threshold_value: Optional[str] = Field(None, max_length=255)
    threshold_value2: Optional[str] = Field(None, max_length=255)
    field_target: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class ConditionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rule_set_id: UUID
    condition_name: str
    condition_type: str
    severity: str
    operator: str
    threshold_value: Optional[str]
    threshold_value2: Optional[str]
    field_target: Optional[str]
    description: Optional[str]
    is_active: bool
    sort_order: int
    created_at: datetime


# ── Rule Set ─────────────────────────────────────────
class TypeRuleSetCreate(BaseModel):
    company_id: Optional[UUID] = Field(None, description="NULL = system template")
    invoice_type_id: UUID
    parent_rule_set_id: Optional[UUID] = None
    rule_set_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    conditions: list[ConditionCreate] = []


class TypeRuleSetUpdate(BaseModel):
    rule_set_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TypeRuleSetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    invoice_type_id: UUID
    parent_rule_set_id: Optional[UUID]
    rule_set_name: str
    description: Optional[str]
    is_active: bool
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    conditions: list[ConditionResponse] = []


class TypeRuleSetListResponse(BaseModel):
    items: list[TypeRuleSetResponse]
    total: int
