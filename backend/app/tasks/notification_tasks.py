import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Celery 동기 워커에서 코루틴을 안전하게 실행"""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _send_notification_email(notification_id: str):
    """알림 ID로 DB 조회 후 이메일 발송"""
    from uuid import UUID
    from sqlalchemy import select
    from app.models.notification import Notification
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Notification).where(Notification.id == UUID(notification_id))
            )
            notification = result.scalar_one_or_none()
            if not notification:
                logger.warning("Notification %s not found", notification_id)
                return

            if notification.email_sent:
                logger.info("Notification %s email already sent", notification_id)
                return

            # 사용자 조회
            user_result = await db.execute(
                select(User).where(User.id == notification.user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user or not user.notification_email:
                logger.info(
                    "User %s not found or email notification disabled",
                    notification.user_id,
                )
                return

            # SMTP 설정 확인
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                logger.warning("SMTP not configured, skipping email for %s", notification_id)
                return

            # 이메일 생성
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_USER
            msg["To"] = user.email
            msg["Subject"] = f"[Invoice System] {notification.title}"

            body = notification.message or notification.title
            msg.attach(MIMEText(body, "plain", "utf-8"))

            # 이메일 발송
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            # email_sent 플래그 업데이트
            notification.email_sent = True
            await db.commit()
            logger.info("Email sent for notification %s to %s", notification_id, user.email)

        except smtplib.SMTPException as e:
            logger.error("SMTP error for notification %s: %s", notification_id, e)
            await db.rollback()
        except Exception as e:
            logger.error("Failed to send email for notification %s: %s", notification_id, e)
            await db.rollback()


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.notification_tasks.send_notification_email",
)
def send_notification_email(self, notification_id: str):
    """알림 이메일 비동기 발송 (Celery task)"""
    try:
        _run_async(_send_notification_email(notification_id))
    except Exception as exc:
        logger.error("send_notification_email failed: %s", exc)
        self.retry(exc=exc)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    name="app.tasks.notification_tasks.send_password_reset_email",
)
def send_password_reset_email(self, email: str, token: str):
    """비밀번호 리셋 이메일 발송 (Celery task)"""
    try:
        from urllib.parse import quote
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={quote(token, safe='')}"

        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning("SMTP not configured, skipping password reset email for %s", email)
            logger.info("Password reset link (dev mode): %s", reset_link)
            return

        msg = MIMEMultipart("alternative")
        msg["From"] = settings.SMTP_USER
        msg["To"] = email
        msg["Subject"] = "[Invoice System] Password Reset"

        text_body = (
            f"A password reset has been requested.\n\n"
            f"Click the link below to set a new password:\n"
            f"{reset_link}\n\n"
            f"This link is valid for 30 minutes.\n"
            f"If you did not request this, please ignore this email."
        )

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">AI Invoice Automation</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Password Reset</h2>
                <p style="color: #666; line-height: 1.6;">A password reset has been requested. Click the button below to set a new password.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="color: #999; font-size: 13px;">This link is valid for 30 minutes.</p>
                <p style="color: #999; font-size: 13px;">If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #bbb; font-size: 12px; text-align: center;">AI Invoice Automation System</p>
            </div>
        </div>
        """

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("Password reset email sent to %s", email)

    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending password reset email to %s: %s", email, exc)
        self.retry(exc=exc)
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", email, exc)
        self.retry(exc=exc)
