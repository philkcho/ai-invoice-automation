from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_super_admin, require_admin, get_current_user, ROLE_SUPER_ADMIN
from app.utils.company_access import verify_company_access, verify_company_modify
from app.schemas.type_rule import (
    TypeRuleSetCreate, TypeRuleSetUpdate, TypeRuleSetResponse, TypeRuleSetListResponse,
    ConditionCreate, ConditionUpdate, ConditionResponse,
)
from app.services import type_rule_service

router = APIRouter()


@router.post("", response_model=TypeRuleSetResponse, status_code=201)
async def create_rule_set(
    data: TypeRuleSetCreate, db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id is None:
            data.company_id = current_user["company_id"]
        elif data.company_id != current_user["company_id"]:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await type_rule_service.create_rule_set(db, data, current_user["user_id"])


@router.get("", response_model=TypeRuleSetListResponse)
async def list_rule_sets(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
    invoice_type_id: Optional[UUID] = None, is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await type_rule_service.list_rule_sets(db, skip, limit, company_id, invoice_type_id, is_active)
    return TypeRuleSetListResponse(items=items, total=total)


@router.get("/{rule_set_id}", response_model=TypeRuleSetResponse)
async def get_rule_set(rule_set_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    rule_set = await type_rule_service.get_rule_set(db, rule_set_id)
    verify_company_access(current_user, rule_set.company_id, allow_shared=True)
    return rule_set


@router.patch("/{rule_set_id}", response_model=TypeRuleSetResponse)
async def update_rule_set(rule_set_id: UUID, data: TypeRuleSetUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    rule_set = await type_rule_service.get_rule_set(db, rule_set_id)
    verify_company_modify(current_user, rule_set.company_id)
    return await type_rule_service.update_rule_set(db, rule_set_id, data)


@router.delete("/{rule_set_id}", status_code=204)
async def delete_rule_set(rule_set_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_super_admin)):
    await type_rule_service.delete_rule_set(db, rule_set_id)


# ── Conditions ───────────────────────────────────────
@router.post("/{rule_set_id}/conditions", response_model=ConditionResponse, status_code=201)
async def add_condition(rule_set_id: UUID, data: ConditionCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    rule_set = await type_rule_service.get_rule_set(db, rule_set_id)
    verify_company_modify(current_user, rule_set.company_id)
    return await type_rule_service.add_condition(db, rule_set_id, data)


@router.patch("/conditions/{condition_id}", response_model=ConditionResponse)
async def update_condition(condition_id: UUID, data: ConditionUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    condition = await type_rule_service.get_condition(db, condition_id)
    rule_set = await type_rule_service.get_rule_set(db, condition.rule_set_id)
    verify_company_modify(current_user, rule_set.company_id)
    return await type_rule_service.update_condition(db, condition_id, data)


@router.delete("/conditions/{condition_id}", status_code=204)
async def delete_condition(condition_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    condition = await type_rule_service.get_condition(db, condition_id)
    rule_set = await type_rule_service.get_rule_set(db, condition.rule_set_id)
    verify_company_modify(current_user, rule_set.company_id)
    await type_rule_service.delete_condition(db, condition_id)
