from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_super_admin, require_admin, get_current_user, ROLE_SUPER_ADMIN
from app.utils.company_access import verify_company_access, verify_company_modify
from app.schemas.global_rule import GlobalRuleCreate, GlobalRuleUpdate, GlobalRuleResponse, GlobalRuleListResponse
from app.services import global_rule_service

router = APIRouter()


@router.post("", response_model=GlobalRuleResponse, status_code=201)
async def create_rule(
    data: GlobalRuleCreate, db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id is None:
            data.company_id = current_user["company_id"]
        elif data.company_id != current_user["company_id"]:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await global_rule_service.create_rule(db, data, current_user["user_id"])


@router.get("", response_model=GlobalRuleListResponse)
async def list_rules(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
    rule_type: Optional[str] = None, is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await global_rule_service.list_rules(db, skip, limit, company_id, rule_type, is_active)
    return GlobalRuleListResponse(items=items, total=total)


@router.get("/{rule_id}", response_model=GlobalRuleResponse)
async def get_rule(rule_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    rule = await global_rule_service.get_rule(db, rule_id)
    verify_company_access(current_user, rule.company_id, allow_shared=True)
    return rule


@router.patch("/{rule_id}", response_model=GlobalRuleResponse)
async def update_rule(rule_id: UUID, data: GlobalRuleUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    rule = await global_rule_service.get_rule(db, rule_id)
    verify_company_modify(current_user, rule.company_id)
    return await global_rule_service.update_rule(db, rule_id, data)


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(rule_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_super_admin)):
    await global_rule_service.delete_rule(db, rule_id)
