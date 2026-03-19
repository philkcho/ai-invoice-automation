"""이메일 설정 API — OAuth 연결, CRUD, 테스트 폴링"""
import secrets
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

# OAuth state 임시 저장 (프로덕션에서는 Redis 사용 권장)
_oauth_states: dict[str, str] = {}


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

    # CSRF 방지: 랜덤 nonce + config_id 바인딩
    nonce = secrets.token_urlsafe(32)
    state = f"{config_id}:{nonce}"
    _oauth_states[state] = str(config_id)

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

    # state 검증 (CSRF 방지)
    if data.state:
        stored_config_id = _oauth_states.pop(data.state, None)
        if stored_config_id != str(config_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OAuth state. Please reconnect.",
            )

    if config.email_provider == "GMAIL":
        credentials = await email_service.exchange_gmail_code(data.code)
    else:
        credentials = await email_service.exchange_outlook_code(data.code)

    # 자격증명 필수 필드 검증
    if "access_token" not in credentials:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OAuth provider did not return an access token.",
        )

    updated = await email_configuration_service.save_oauth_credentials(
        db, config_id, credentials
    )
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

    from app.tasks.email_tasks import poll_single_account
    try:
        fetched, created = await poll_single_account(db, config)
        await db.commit()
        return {"emails_fetched": fetched, "invoices_created": created, "errors": []}
    except Exception as e:
        await db.rollback()
        return {"emails_fetched": 0, "invoices_created": 0, "errors": [str(e)]}


@router.get("/{config_id}/processed-messages")
async def get_processed_messages(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """처리된 메시지 ID 목록 + 제목/발신자 조회"""
    import json as json_mod
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)
    try:
        ids = json_mod.loads(config.processed_message_ids or "[]")
    except Exception:
        ids = []

    # Gmail/Outlook API로 메시지 상세 조회
    messages = []
    if ids:
        try:
            from app.services.email_configuration_service import get_decrypted_credentials
            creds = get_decrypted_credentials(config)
            access_token = creds.get("access_token", "")

            # 토큰 갱신
            try:
                if config.email_provider == "GMAIL":
                    new_creds = await email_service.refresh_gmail_token(creds.get("refresh_token", ""))
                else:
                    new_creds = await email_service.refresh_outlook_token(creds.get("refresh_token", ""))
                access_token = new_creds["access_token"]
            except Exception:
                pass

            import httpx
            async with httpx.AsyncClient() as client:
                for mid in ids:
                    try:
                        if config.email_provider == "GMAIL":
                            resp = await client.get(
                                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}",
                                headers={"Authorization": f"Bearer {access_token}"},
                                params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                            )
                            if resp.status_code == 200:
                                data = resp.json()
                                headers_map = {h["name"].lower(): h["value"] for h in data.get("payload", {}).get("headers", [])}
                                # 첨부파일 수 확인
                                att_count = 0
                                def _count_atts(part):
                                    nonlocal att_count
                                    if part.get("filename") and part.get("body", {}).get("attachmentId"):
                                        att_count += 1
                                    for sub in part.get("parts", []):
                                        _count_atts(sub)
                                _count_atts(data.get("payload", {}))

                                messages.append({
                                    "message_id": mid,
                                    "subject": headers_map.get("subject", ""),
                                    "from": headers_map.get("from", ""),
                                    "date": headers_map.get("date", ""),
                                    "snippet": data.get("snippet", ""),
                                    "attachments": att_count,
                                })
                            else:
                                messages.append({"message_id": mid, "subject": "(unavailable)", "from": "", "date": "", "snippet": "", "attachments": 0})
                        else:
                            messages.append({"message_id": mid, "subject": "(Outlook)", "from": "", "date": "", "snippet": "", "attachments": 0})
                    except Exception:
                        messages.append({"message_id": mid, "subject": "(error)", "from": "", "date": "", "snippet": "", "attachments": 0})
        except Exception:
            messages = [{"message_id": mid, "subject": "(unable to fetch)", "from": "", "date": "", "snippet": "", "attachments": 0} for mid in ids]

    # DB에서 이메일로 생성된 인보이스 매칭 (notes에 subject 포함)
    from sqlalchemy import select
    from app.models.invoice import Invoice
    invoices_result = await db.execute(
        select(Invoice).where(
            Invoice.company_id == config.company_id,
            Invoice.source_channel == ("GMAIL" if config.email_provider == "GMAIL" else "OUTLOOK"),
        ).order_by(Invoice.created_at.desc())
    )
    invoices_list = invoices_result.scalars().all()

    # subject로 매칭 시도
    for msg in messages:
        msg["invoice_number"] = None
        msg["invoice_amount"] = None
        msg["invoice_status"] = None
        for inv in invoices_list:
            if inv.notes and msg.get("subject") and msg["subject"] in (inv.notes or ""):
                msg["invoice_number"] = inv.invoice_number
                msg["invoice_amount"] = float(inv.amount_total)
                msg["invoice_status"] = inv.status
                break

    return {
        "config_id": str(config_id),
        "processed_count": len(ids),
        "messages": messages,
        "last_polled_at": str(config.last_polled_at) if config.last_polled_at else None,
    }


@router.delete("/{config_id}/processed-messages", status_code=200)
async def reset_processed_messages(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """처리된 메시지 ID 전체 초기화 (재폴링 가능)"""
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)
    config.processed_message_ids = "[]"
    config.last_polled_at = None
    await db.flush()
    return {"message": "Processed messages reset successfully"}


@router.post("/{config_id}/processed-messages/remove", status_code=200)
async def remove_processed_messages(
    config_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """선택한 메시지 ID만 제거 (해당 메시지 재폴링 가능)"""
    import json as json_mod
    config = await email_configuration_service.get_email_config(db, config_id)
    verify_company_access(current_user, config.company_id)

    ids_to_remove = set(body.get("message_ids", []))
    try:
        current_ids = json_mod.loads(config.processed_message_ids or "[]")
    except Exception:
        current_ids = []

    new_ids = [mid for mid in current_ids if mid not in ids_to_remove]
    config.processed_message_ids = json_mod.dumps(new_ids)
    config.last_polled_at = None  # 재폴링을 위해 타임스탬프도 리셋
    await db.flush()
    return {"removed": len(ids_to_remove), "remaining": len(new_ids)}
