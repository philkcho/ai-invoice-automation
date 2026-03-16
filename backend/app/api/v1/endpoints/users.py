from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    require_super_admin,
    require_admin,
    get_current_user,
    ROLE_SUPER_ADMIN,
    ROLE_COMPANY_ADMIN,
)
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    PasswordChange,
)
from app.services import user_service

router = APIRouter()


def _check_company_access(current_user: dict, target_company_id: Optional[UUID]):
    """Company Admin은 자기 회사 사용자만 접근 가능"""
    if current_user["role"] == ROLE_SUPER_ADMIN:
        return
    if current_user["company_id"] != target_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: different company",
        )


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """사용자 생성 (Super Admin: 모든 회사, Company Admin: 자기 회사만)"""
    # Company Admin은 자기 회사에만 사용자 생성 가능
    if current_user["role"] == ROLE_COMPANY_ADMIN:
        if data.company_id != current_user["company_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company Admin can only create users in own company",
            )
        # Company Admin은 Super Admin 역할 부여 불가
        if data.role == ROLE_SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company Admin cannot create Super Admin users",
            )

    return await user_service.create_user(db, data)


@router.get("", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    company_id: Optional[UUID] = None,
    role: Optional[str] = Query(None, pattern=r"^(SUPER_ADMIN|COMPANY_ADMIN|ACCOUNTANT|APPROVER|VIEWER)$"),
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, max_length=255),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """사용자 목록 조회 (Company Admin은 자기 회사만)"""
    # Company Admin은 자기 회사 사용자만 조회
    if current_user["role"] == ROLE_COMPANY_ADMIN:
        company_id = current_user["company_id"]

    items, total = await user_service.list_users(
        db, skip, limit, company_id, role, is_active, search
    )
    return UserListResponse(items=items, total=total)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """현재 로그인한 사용자 정보 조회"""
    return await user_service.get_user(db, current_user["user_id"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """사용자 상세 조회"""
    user = await user_service.get_user(db, user_id)
    _check_company_access(current_user, user.company_id)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """사용자 수정 (회사 간 이동은 Super Admin만)"""
    user = await user_service.get_user(db, user_id)
    _check_company_access(current_user, user.company_id)

    # Company Admin 제한사항
    if current_user["role"] == ROLE_COMPANY_ADMIN:
        if data.company_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Super Admin can move users between companies",
            )
        if data.role == ROLE_SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Company Admin cannot assign Super Admin role",
            )

    return await user_service.update_user(db, user_id, data)


@router.post("/{user_id}/change-password", status_code=204)
async def change_password(
    user_id: UUID,
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """비밀번호 변경 (본인만 또는 Super Admin)"""
    if current_user["user_id"] != user_id and current_user["role"] != ROLE_SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only change own password",
        )
    await user_service.change_password(db, user_id, data)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    """사용자 삭제 (Super Admin 전용)"""
    if current_user["user_id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )
    await user_service.delete_user(db, user_id)
