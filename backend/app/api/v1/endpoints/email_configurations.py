"""이메일 설정 API — OAuth 연결, CRUD, 테스트 폴링"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, ROLE_SUPER_ADMIN
from app.utils.company_access import verify_company_access
from app.schemas.email_configuration import (
    EmailConfigCreate, EmailConfigUpdate,
    EmailConfigResponse, EmailConfigListResponse,
    OAuthCallbackRequest, OAuthUrlResponse, TestPollResponse,
)
from app.services import email_configuration_service, email_service

router = APIRouter()


# ── CRUD ─────────────────────────────────────────────

@router.post("", response_model=EmailConfigResponse, status_code=201)
async def create_email_config(
    data: EmailConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """이메일 설정 생성 (COMPANY_ADMIN 이상)"""
    verify_company_access(current_user, data.company_id)
    config = await email_configuration_service.create_email_config(
        db,
        company_id=data.company_id,
        email_provider=data.email_provider,
        email_address=data.email_address,
        filter_keywords=data.filter_keywords,
        filter_senders=data.filter_senders,
        is_active=data.is_active,
    )
    await db.commit()
    return config


@router.get("", response_model=EmailConfigListResponse)
async def list_email_configs(
    company_id: Optional[uuid.UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """이메일 설정 목록 조회"""
    if current_user["role"] != ROLE_SUPER_ADMIN:
        company_id = current_user["company_id"]
    items, total = await email_configuration_service.list_email_configs(
        db, company_id=company_id, is_active=is_active, skip=skip, limit=limit
    )
    return {"items": items, "total": total}


@router.get("/{config_id}", response_model=EmailConfigResponse)
async def get_email_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """이메일 설정 상세 조회"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)
    return config


@router.put("/{config_id}", response_model=EmailConfigResponse)
async def update_email_config(
    config_id: uuid.UUID,
    data: EmailConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """이메일 설정 수정"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)
    updated = await email_configuration_service.update_email_config(
        db, config_id, **data.model_dump(exclude_unset=True)
    )
    await db.commit()
    return updated


@router.delete("/{config_id}", status_code=204)
async def delete_email_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """이메일 설정 삭제"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)
    await email_configuration_service.delete_email_config(db, config_id)
    await db.commit()


# ── OAuth ────────────────────────────────────────────

@router.post("/{config_id}/oauth/connect", response_model=OAuthUrlResponse)
async def get_oauth_url(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """OAuth 인증 URL 생성 — 프론트에서 이 URL로 리다이렉트"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)

    state = f"{config_id}"

    if config.email_provider == "GMAIL":
        auth_url = email_service.get_gmail_auth_url(state)
    else:
        auth_url = email_service.get_outlook_auth_url(state)

    return {"auth_url": auth_url}


@router.post("/{config_id}/oauth/callback", response_model=EmailConfigResponse)
async def oauth_callback(
    config_id: uuid.UUID,
    data: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """OAuth 콜백 처리 — authorization code → token 교환 후 저장"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)

    if config.email_provider == "GMAIL":
        credentials = await email_service.exchange_gmail_code(data.code)
    else:
        credentials = await email_service.exchange_outlook_code(data.code)

    updated = await email_configuration_service.save_oauth_credentials(
        db, config_id, credentials
    )
    await db.commit()
    return updated


# ── 테스트 폴링 ─────────────────────────────────────

@router.post("/{config_id}/test-poll", response_model=TestPollResponse)
async def test_poll(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """수동 테스트 폴링 (1회 즉시 실행)"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)

    if not config.credentials_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth credentials not configured. Connect your email first.",
        )

    from app.tasks.email_tasks import _poll_single_account
    try:
        fetched, created = await _poll_single_account(db, config)
        await db.commit()
        return {"emails_fetched": fetched, "invoices_created": created, "errors": []}
    except Exception as e:
        return {"emails_fetched": 0, "invoices_created": 0, "errors": [str(e)]}
