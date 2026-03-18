from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, ROLE_SUPER_ADMIN
from app.utils.company_access import verify_company_access, verify_company_modify
from app.schemas.company_policy import (
    CompanyPolicyCreate, CompanyPolicyUpdate,
    CompanyPolicyResponse, CompanyPolicyListResponse,
)
from app.services import company_policy_service

router = APIRouter()


@router.post("", response_model=CompanyPolicyResponse, status_code=201)
async def create_company_policy(
    data: CompanyPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 정책 생성 (COMPANY_ADMIN 이상)"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id != current_user["company_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await company_policy_service.create_policy(db, data)


@router.get("", response_model=CompanyPolicyListResponse)
async def list_company_policies(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 정책 목록 조회"""
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await company_policy_service.list_policies(
        db, company_id, category, is_active, skip, limit
    )
    return CompanyPolicyListResponse(items=items, total=total)


@router.get("/{policy_id}", response_model=CompanyPolicyResponse)
async def get_company_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 정책 상세 조회"""
    policy = await company_policy_service.get_policy(db, policy_id)
    verify_company_access(current_user, policy.company_id)
    return policy


@router.patch("/{policy_id}", response_model=CompanyPolicyResponse)
async def update_company_policy(
    policy_id: UUID,
    data: CompanyPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 정책 수정"""
    policy = await company_policy_service.get_policy(db, policy_id)
    verify_company_modify(current_user, policy.company_id)
    return await company_policy_service.update_policy(db, policy_id, data)


@router.delete("/{policy_id}", status_code=204)
async def delete_company_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """회사 정책 삭제"""
    policy = await company_policy_service.get_policy(db, policy_id)
    verify_company_modify(current_user, policy.company_id)
    await company_policy_service.delete_policy(db, policy_id)
