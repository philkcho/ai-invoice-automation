"""
Contact form — 공개 엔드포인트 (인증 불필요)
폼 제출 → SMTP로 관리자에게 이메일 발송
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@router.post("", status_code=200)
async def send_contact(payload: ContactRequest):
    """Send contact form email to admin."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise HTTPException(status_code=503, detail="Email service is not configured")

    recipient = settings.SMTP_USER  # 관리자 이메일로 발송

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = recipient
    safe_subject = payload.subject.replace('\n', ' ').replace('\r', ' ')
    msg["Subject"] = f"[Contact] {safe_subject}"
    msg["Reply-To"] = payload.email

    body = (
        f"Name: {payload.name}\n"
        f"Email: {payload.email}\n"
        f"Subject: {payload.subject}\n"
        f"{'─' * 40}\n\n"
        f"{payload.message}"
    )
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Contact email sent from %s: %s", payload.email, payload.subject)
    except Exception as e:
        logger.error("Failed to send contact email: %s", e)
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again later.")

    return {"message": "Your message has been sent successfully."}
