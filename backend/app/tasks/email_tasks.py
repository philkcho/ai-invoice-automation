"""
이메일 폴링 Celery Task — Gmail/Outlook에서 인보이스 이메일 자동 수집
5분마다 실행, 첨부파일 추출 → OCR 파이프라인 연결.
"""
import asyncio
import json
import logging
import os
import uuid
from collections import deque
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

MAX_PROCESSED_IDS = 500  # FIFO 최대 보관 수
MAX_ATTACHMENTS_PER_MESSAGE = 10  # 메시지당 최대 첨부파일 수
MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024  # 50MB
MAX_CONSECUTIVE_ERRORS = 10  # 연속 에러 초과 시 자동 비활성화


@celery_app.task(
    bind=True,
    max_retries=1,
    default_retry_delay=120,
    name="app.tasks.email_tasks.poll_all_email_accounts",
)
def poll_all_email_accounts(self):
    """활성 이메일 설정 전체 폴링 (Celery Beat에서 5분마다 실행)"""
    logger.info("Starting email polling for all active accounts")
    try:
        result = asyncio.run(_poll_all())
        logger.info("Email polling completed: %s", result)
        return result
    except Exception as exc:
        logger.error("Email polling failed: %s", exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=120)
        return {"status": "FAILED", "error": str(exc)}


async def _poll_all() -> dict:
    """모든 활성 이메일 설정에 대해 폴링 수행"""
    from app.core.database import AsyncSessionLocal
    from app.services.email_configuration_service import get_active_configs

    total_fetched = 0
    total_created = 0
    errors = []

    async with AsyncSessionLocal() as db:
        configs = await get_active_configs(db)
        logger.info("Found %d active email configurations", len(configs))

        for config in configs:
            try:
                fetched, created = await poll_single_account(db, config)
                total_fetched += fetched
                total_created += created
                # 계정별 커밋 (한 계정 실패가 다른 계정에 영향 없도록)
                await db.commit()
            except Exception as e:
                await db.rollback()
                error_msg = f"{config.email_address}: {type(e).__name__}"
                logger.error("Poll failed for %s: %s", config.email_address, e)
                errors.append(error_msg)
                # 에러 카운트 증가 (별도 트랜잭션)
                try:
                    config.poll_error_count += 1
                    config.last_error_message = _sanitize_error(str(e))
                    # 연속 에러 초과 시 자동 비활성화
                    if config.poll_error_count >= MAX_CONSECUTIVE_ERRORS:
                        config.is_active = False
                        logger.critical(
                            "Auto-disabled email config %s after %d consecutive errors",
                            config.email_address, config.poll_error_count,
                        )
                    await db.commit()
                except Exception:
                    await db.rollback()

    return {
        "status": "COMPLETED",
        "accounts_polled": len(configs),
        "emails_fetched": total_fetched,
        "invoices_created": total_created,
        "errors": errors,
    }


async def poll_single_account(db, config) -> tuple[int, int]:
    """단일 이메일 계정 폴링 (test-poll에서도 호출)"""
    from app.services.email_configuration_service import get_decrypted_credentials
    from app.services import email_service

    credentials = get_decrypted_credentials(config)
    if not credentials:
        raise ValueError("No OAuth credentials configured")

    access_token = credentials.get("access_token")
    refresh_token = credentials.get("refresh_token")

    if not access_token:
        raise ValueError("No access token in credentials")
    if not refresh_token:
        raise ValueError("No refresh token in credentials")

    # 토큰 갱신 시도
    try:
        if config.email_provider == "GMAIL":
            new_creds = await email_service.refresh_gmail_token(refresh_token)
        else:
            new_creds = await email_service.refresh_outlook_token(refresh_token)

        access_token = new_creds["access_token"]
        # 갱신된 토큰 저장
        from app.services.email_configuration_service import save_oauth_credentials
        await save_oauth_credentials(db, config.id, new_creds)
    except Exception as e:
        logger.warning("Token refresh failed for %s, trying existing token: %s", config.email_address, e)

    # 필터 파싱
    filter_keywords = [k.strip() for k in (config.filter_keywords or "").split(",") if k.strip()] or None
    filter_senders = [s.strip() for s in (config.filter_senders or "").split(",") if s.strip()] or None

    # 이전 처리 ID 로드 (순서 보존을 위해 list 유지)
    processed_id_list = []
    if config.processed_message_ids:
        try:
            processed_id_list = json.loads(config.processed_message_ids)
            if not isinstance(processed_id_list, list):
                processed_id_list = []
        except json.JSONDecodeError:
            processed_id_list = []
    processed_id_set = set(processed_id_list)

    # 메시지 조회
    if config.email_provider == "GMAIL":
        messages = await email_service.fetch_gmail_messages(
            access_token=access_token,
            after_timestamp=config.last_polled_at,
            filter_keywords=filter_keywords,
            filter_senders=filter_senders,
        )
        parsed_messages = [email_service.parse_gmail_message(m) for m in messages]
    else:
        messages = await email_service.fetch_outlook_messages(
            access_token=access_token,
            after_timestamp=config.last_polled_at,
            filter_keywords=filter_keywords,
            filter_senders=filter_senders,
        )
        parsed_messages = [email_service.parse_outlook_message(m) for m in messages]

    # 중복 제거
    new_messages = [m for m in parsed_messages if m["message_id"] not in processed_id_set]
    print(f"*** POLL {config.email_address}: {len(parsed_messages)} fetched, {len(new_messages)} new, processed_ids={len(processed_id_set)}", flush=True)
    for pm in parsed_messages:
        print(f"*** MSG {pm.get('message_id')}: subject='{pm.get('subject')}', attachments={len(pm.get('attachments', []))}, att_details={[(a.get('filename'), a.get('mime_type')) for a in pm.get('attachments', [])]}", flush=True)

    created_count = 0
    successfully_processed = []
    for msg in new_messages:
        try:
            created = await _process_email_message(db, config, msg, access_token)
            if created:
                created_count += 1
            successfully_processed.append(msg["message_id"])
        except Exception as e:
            logger.error("Failed to process message %s: %s", msg["message_id"], e)
            # 처리 실패한 메시지는 processed에 추가하지 않아 다음 폴링에서 재시도

    # 처리 ID 목록 업데이트 (순서 보존 FIFO)
    processed_id_list.extend(successfully_processed)
    if len(processed_id_list) > MAX_PROCESSED_IDS:
        processed_id_list = processed_id_list[-MAX_PROCESSED_IDS:]

    config.processed_message_ids = json.dumps(processed_id_list)
    # 새 메시지가 있었을 때만 last_polled_at 업데이트 (실패 시 재시도 가능)
    if successfully_processed or not new_messages:
        config.last_polled_at = datetime.now(timezone.utc)
    if successfully_processed:
        config.last_message_id = successfully_processed[-1]
    config.poll_error_count = 0  # 성공 시 에러 카운트 리셋
    config.last_error_message = None
    await db.flush()

    return len(new_messages), created_count


async def _process_email_message(db, config, message: dict, access_token: str) -> bool:
    """이메일 메시지에서 첨부파일 추출 → 인보이스 생성 → OCR 큐잉"""
    from app.services import email_service
    from app.models.invoice import Invoice
    from app.services import notification_service

    # 첨부파일 조회
    if config.email_provider == "GMAIL":
        attachments = message.get("attachments", [])
    else:
        attachments = await email_service.fetch_outlook_attachments(
            access_token, message["message_id"]
        )

    logger.info("Message %s has %d attachments: %s",
        message.get("message_id"), len(attachments),
        [(a.get("filename"), a.get("mime_type")) for a in attachments])
    if not attachments:
        logger.info("No attachments found for message %s", message.get("message_id"))
        return False

    # 첨부파일 수 제한
    if len(attachments) > MAX_ATTACHMENTS_PER_MESSAGE:
        logger.warning(
            "Message %s has %d attachments, processing first %d only",
            message["message_id"], len(attachments), MAX_ATTACHMENTS_PER_MESSAGE,
        )
        attachments = attachments[:MAX_ATTACHMENTS_PER_MESSAGE]

    created = False
    for att in attachments:
        # 첨부파일 크기 검증
        att_size = att.get("size", 0)
        if att_size > MAX_ATTACHMENT_SIZE:
            logger.warning(
                "Skipping attachment %s (%.1fMB > %.1fMB limit)",
                att.get("filename", "unknown"),
                att_size / (1024 * 1024),
                MAX_ATTACHMENT_SIZE / (1024 * 1024),
            )
            continue

        # 첨부파일 다운로드
        if config.email_provider == "GMAIL":
            file_content = await email_service.download_gmail_attachment(
                access_token, message["message_id"], att["attachment_id"]
            )
        else:
            import base64
            file_content = base64.b64decode(att["content_bytes"]) if att.get("content_bytes") else None
            if not file_content:
                continue

        # 다운로드 후 실제 크기 재검증
        if len(file_content) > MAX_ATTACHMENT_SIZE:
            logger.warning("Attachment content exceeds size limit after download, skipping")
            continue

        # 파일 저장 (파일명 sanitize로 directory traversal 방지)
        raw_filename = att.get("filename", f"attachment_{uuid.uuid4().hex[:8]}")
        filename = os.path.basename(raw_filename)  # ../../../ 등 경로 제거
        if not filename:
            filename = f"attachment_{uuid.uuid4().hex[:8]}"

        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in (".pdf", ".jpg", ".jpeg", ".png"):
            continue

        unique_name = f"{uuid.uuid4().hex[:12]}_{filename}"
        relative_path = f"email_attachments/{config.company_id}/{unique_name}"
        full_path = os.path.join("/app/media", relative_path)

        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_content)

        # 기본 vendor_id, invoice_type_id 조회 (이메일 수신 시 OCR 후 수정 예정)
        from sqlalchemy import select
        from app.models.vendor import Vendor
        from app.models.invoice_type import InvoiceType
        default_vendor = (await db.execute(
            select(Vendor).limit(1)
        )).scalar_one_or_none()
        default_type = (await db.execute(
            select(InvoiceType).limit(1)
        )).scalar_one_or_none()

        if not default_vendor or not default_type:
            print(f"No default vendor or invoice type found, skipping", flush=True)
            continue

        # 인보이스 생성
        source_channel = "GMAIL" if config.email_provider == "GMAIL" else "OUTLOOK"
        invoice = Invoice(
            company_id=config.company_id,
            vendor_id=default_vendor.id,
            invoice_type_id=default_type.id,
            invoice_number=f"EMAIL-{uuid.uuid4().hex[:8].upper()}",
            source_channel=source_channel,
            source_email=message.get("from", ""),
            file_path=relative_path,
            status="RECEIVED",
            ocr_status="PENDING",
            notes=f"Email subject: {message.get('subject', '')}",
        )
        db.add(invoice)
        await db.flush()
        await db.refresh(invoice)

        # OCR 태스크 큐잉
        from app.tasks.ocr_tasks import process_invoice_ocr
        process_invoice_ocr.delay(str(invoice.id), relative_path)

        # 알림 생성
        await notification_service.create_role_notifications(
            db,
            company_id=config.company_id,
            role="ACCOUNTANT",
            type="EMAIL_RECEIVED",
            title=f"이메일 인보이스 수신: {message.get('subject', 'No Subject')}",
            message=f"발신자: {message.get('from', 'Unknown')} — OCR 처리 중",
            entity_type="invoice",
            entity_id=invoice.id,
        )

        created = True
        logger.info("Invoice created from email: %s (invoice=%s)", filename, invoice.id)

    return created


def _sanitize_error(error_msg: str) -> str:
    """에러 메시지에서 민감 정보 제거"""
    import re
    # OAuth 토큰, API 키 등 마스킹
    sanitized = re.sub(r'(Bearer\s+)\S+', r'\1[REDACTED]', error_msg)
    sanitized = re.sub(r'(access_token["\s:=]+)\S+', r'\1[REDACTED]', sanitized)
    sanitized = re.sub(r'(refresh_token["\s:=]+)\S+', r'\1[REDACTED]', sanitized)
    return sanitized[:500]
