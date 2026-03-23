"""Email Digest Settings API — CRUD, SMTP test, recipients, test send"""
import html as html_mod
import logging
import smtplib
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_admin
from app.models.email_digest_setting import EmailDigestSetting, EmailDigestRecipient
from app.schemas.email_digest import (
    DigestSettingUpdate, DigestSettingResponse,
    RecipientCreate, DigestRecipientResponse,
    SmtpTestRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Settings ──────────────────────────────────────────

@router.get("", response_model=DigestSettingResponse | None)
async def get_digest_setting(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Get digest setting for current company."""
    company_id = current_user["company_id"]
    result = await db.execute(
        select(EmailDigestSetting).where(EmailDigestSetting.company_id == company_id)
    )
    setting = result.scalar_one_or_none()
    return setting


@router.put("", response_model=DigestSettingResponse)
async def upsert_digest_setting(
    data: DigestSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Create or update digest setting for current company."""
    company_id = current_user["company_id"]
    result = await db.execute(
        select(EmailDigestSetting).where(EmailDigestSetting.company_id == company_id)
    )
    setting = result.scalar_one_or_none()

    update_data = data.model_dump(exclude_unset=True)

    # Don't overwrite password with None if not provided
    if "smtp_password" in update_data and update_data["smtp_password"] is None:
        del update_data["smtp_password"]

    if setting:
        for key, value in update_data.items():
            setattr(setting, key, value)
    else:
        setting = EmailDigestSetting(company_id=company_id, **update_data)
        db.add(setting)

    await db.flush()
    await db.refresh(setting)
    return setting


# ── SMTP Test ─────────────────────────────────────────

@router.post("/test-smtp")
async def test_smtp_connection(
    data: SmtpTestRequest,
    current_user: dict = Depends(require_admin),
):
    """Test SMTP connection with provided credentials."""
    try:
        with smtplib.SMTP(data.smtp_host, data.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(data.smtp_user, data.smtp_password)
        return {"success": True, "message": "SMTP connection successful"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SMTP connection failed: {str(e)}",
        )


# ── Recipients ────────────────────────────────────────

@router.get("/recipients", response_model=list[DigestRecipientResponse])
async def list_recipients(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """List all digest recipients for current company."""
    company_id = current_user["company_id"]
    result = await db.execute(
        select(EmailDigestRecipient)
        .join(EmailDigestSetting)
        .where(EmailDigestSetting.company_id == company_id)
        .order_by(EmailDigestRecipient.created_at)
    )
    return result.scalars().all()


@router.post("/recipients", response_model=DigestRecipientResponse, status_code=201)
async def add_recipient(
    data: RecipientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Add a recipient (system user or external email)."""
    company_id = current_user["company_id"]

    # Get or create digest setting
    result = await db.execute(
        select(EmailDigestSetting).where(EmailDigestSetting.company_id == company_id)
    )
    setting = result.scalar_one_or_none()
    if not setting:
        setting = EmailDigestSetting(company_id=company_id)
        db.add(setting)
        await db.flush()

    # Check duplicate
    existing = await db.execute(
        select(EmailDigestRecipient).where(
            EmailDigestRecipient.digest_setting_id == setting.id,
            EmailDigestRecipient.email == data.email,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already a recipient",
        )

    recipient = EmailDigestRecipient(
        digest_setting_id=setting.id,
        user_id=data.user_id,
        email=data.email,
        name=data.name,
    )
    db.add(recipient)
    await db.flush()
    await db.refresh(recipient)
    return recipient


@router.delete("/recipients/{recipient_id}", status_code=204)
async def remove_recipient(
    recipient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Remove a recipient."""
    company_id = current_user["company_id"]
    result = await db.execute(
        select(EmailDigestRecipient)
        .join(EmailDigestSetting)
        .where(
            EmailDigestRecipient.id == recipient_id,
            EmailDigestSetting.company_id == company_id,
        )
    )
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    await db.execute(
        delete(EmailDigestRecipient).where(EmailDigestRecipient.id == recipient_id)
    )


# ── Test Send ─────────────────────────────────────────

@router.post("/test")
async def send_test_digest(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Send a test digest email to all active recipients."""
    company_id = current_user["company_id"]
    result = await db.execute(
        select(EmailDigestSetting).where(EmailDigestSetting.company_id == company_id)
    )
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail="Digest settings not configured")

    active_recipients = [r for r in setting.recipients if r.is_active]
    if not active_recipients:
        raise HTTPException(status_code=400, detail="No active recipients")

    # Determine SMTP
    smtp_host = setting.smtp_host or settings.SMTP_HOST
    smtp_port = setting.smtp_port or settings.SMTP_PORT
    smtp_user = setting.smtp_user or settings.SMTP_USER
    smtp_pass = setting.smtp_password or settings.SMTP_PASSWORD
    from_name = setting.smtp_from_name or "AI Invoice"

    if not smtp_user or not smtp_pass:
        raise HTTPException(status_code=503, detail="SMTP not configured")

    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    sent_count = 0
    for r in active_recipients:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{from_name} <{smtp_user}>"
        msg["To"] = r.email
        msg["Subject"] = "AI Invoice — Test Digest Email"

        text = "This is a test digest email from AI Invoice. Your digest settings are configured correctly!"
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:12px;padding:24px;color:white;text-align:center;">
                <h1 style="margin:0;font-size:24px;">AI Invoice</h1>
                <p style="margin:8px 0 0;opacity:0.8;">Test Digest Email</p>
            </div>
            <div style="padding:24px;background:#f9fafb;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
                <p style="color:#374151;">Hi{(' ' + r.name) if r.name else ''},</p>
                <p style="color:#6b7280;">This is a test email to confirm your digest settings are working correctly.</p>
                <p style="color:#6b7280;">When active, you'll receive periodic summaries of your invoice processing status.</p>
                <div style="margin-top:20px;padding:16px;background:white;border-radius:8px;border:1px solid #e5e7eb;">
                    <p style="margin:0;color:#059669;font-weight:600;">✓ Configuration verified</p>
                    <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">SMTP: {html_mod.escape(str(smtp_host))}:{smtp_port}</p>
                </div>
            </div>
        </div>
        """
        msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            sent_count += 1
        except Exception as e:
            logger.error("Test digest send failed for %s: %s", r.email, e)

    return {"sent": sent_count, "total": len(active_recipients)}
