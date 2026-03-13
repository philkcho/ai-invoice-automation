"""
멀티컴퍼니 격리 미들웨어
모든 인증된 API 요청에서 company_id를 자동으로 컨텍스트에 주입합니다.
Super Admin은 company_id 없이 전체 접근 가능합니다.
"""
from contextvars import ContextVar
from typing import Optional
from uuid import UUID

# 요청 스코프 컨텍스트 변수
current_company_id: ContextVar[Optional[UUID]] = ContextVar("current_company_id", default=None)
current_user_id: ContextVar[Optional[UUID]] = ContextVar("current_user_id", default=None)
current_user_role: ContextVar[Optional[str]] = ContextVar("current_user_role", default=None)


def get_current_company_id() -> Optional[UUID]:
    return current_company_id.get()


def get_current_user_id() -> Optional[UUID]:
    return current_user_id.get()


def get_current_user_role() -> Optional[str]:
    return current_user_role.get()


def set_company_context(company_id: Optional[UUID], user_id: UUID, role: str):
    current_company_id.set(company_id)
    current_user_id.set(user_id)
    current_user_role.set(role)
