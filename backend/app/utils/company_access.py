"""
회사별 데이터 격리 검증 유틸리티

모든 엔드포인트에서 리소스 접근 시 company_id를 검증하여
타 회사 데이터 접근을 차단합니다.
"""
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status

from app.core.security import ROLE_SUPER_ADMIN


def verify_company_access(
    current_user: dict,
    resource_company_id: Optional[UUID],
    *,
    allow_shared: bool = False,
) -> None:
    """
    리소스 조회 시 회사 격리 검증 (GET 용).

    Args:
        current_user: get_current_user 의존성 반환값 {"user_id", "company_id", "role"}
        resource_company_id: 리소스의 company_id (None = shared pool)
        allow_shared: True이면 shared pool(company_id=NULL) 리소스 조회 허용

    Raises:
        HTTPException 403: 접근 권한 없음
    """
    if current_user["role"] == ROLE_SUPER_ADMIN:
        return

    # Shared pool 리소스
    if resource_company_id is None:
        if allow_shared:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # 회사 격리 검증
    if resource_company_id != current_user["company_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


def verify_company_modify(
    current_user: dict,
    resource_company_id: Optional[UUID],
) -> None:
    """
    리소스 수정/삭제 시 회사 격리 검증 (PATCH/DELETE 용).
    Shared pool(company_id=NULL) 리소스는 Super Admin만 수정 가능.

    Args:
        current_user: get_current_user 의존성 반환값
        resource_company_id: 리소스의 company_id

    Raises:
        HTTPException 403: 접근 권한 없음
    """
    if current_user["role"] == ROLE_SUPER_ADMIN:
        return

    if resource_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can modify shared resources",
        )

    if resource_company_id != current_user["company_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
